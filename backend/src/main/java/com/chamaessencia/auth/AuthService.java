package com.chamaessencia.auth;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.chamaessencia.auth.AuthDtos.AccountResponse;
import com.chamaessencia.auth.AuthDtos.ChangePasswordRequest;
import com.chamaessencia.auth.AuthDtos.ChangeQuestionsRequest;
import com.chamaessencia.auth.AuthDtos.LoginRequest;
import com.chamaessencia.auth.AuthDtos.QuestionAnswer;
import com.chamaessencia.auth.AuthDtos.RegisterRequest;
import com.chamaessencia.auth.AuthDtos.ResetPasswordRequest;
import com.chamaessencia.auth.AuthDtos.TokenResponse;
import com.chamaessencia.common.ApiException;
import com.chamaessencia.config.JwtService;
import com.chamaessencia.user.User;
import com.chamaessencia.user.User.SecurityQuestion;
import com.chamaessencia.user.UserRepository;

@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Usuário ou senha inválidos.";
    private static final String RECOVERY_NOT_AVAILABLE = "Usuário não encontrado.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final InviteService invites;
    private final int maxFailedAttempts;
    private final Duration lockDuration;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, InviteService invites,
                       @Value("${app.security.max-failed-attempts}") int maxFailedAttempts,
                       @Value("${app.security.lock-minutes}") long lockMinutes) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.invites = invites;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockDuration = Duration.ofMinutes(lockMinutes);
    }

    public TokenResponse register(RegisterRequest req) {
        String username = normalizeUsername(req.username());
        if (users.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Nome de usuário já está em uso.");
        }
        PasswordPolicy.validate(req.password(), username);
        // Empresa única: só entra quem recebeu convite de um usuário que já tem acesso.
        invites.consume(req.inviteCode(), username);
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(req.password()));
        user.setSecurityQuestions(hashQuestions(req.securityQuestions()));
        users.save(user);
        return new TokenResponse(jwt.generate(user.getId(), username), username, user.isSetupRequired());
    }

    public TokenResponse login(LoginRequest req) {
        User user = users.findByUsername(normalizeUsername(req.username()))
                .orElseThrow(() -> ApiException.unauthorized(INVALID_CREDENTIALS));
        ensureNotLocked(user);
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            lockIfNeeded(user, user.getFailedLoginAttempts());
            users.save(user);
            throw ApiException.unauthorized(INVALID_CREDENTIALS);
        }
        user.setFailedLoginAttempts(0);
        users.save(user);
        return new TokenResponse(jwt.generate(user.getId(), user.getUsername()), user.getUsername(), user.isSetupRequired());
    }

    public List<String> recoveryQuestions(String username) {
        User user = users.findByUsername(normalizeUsername(username))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RECOVERY_NOT_AVAILABLE));
        ensureNotLocked(user);
        if (user.getSecurityQuestions().isEmpty()) {
            throw ApiException.badRequest("Este usuário ainda não cadastrou perguntas de segurança. "
                    + "Entre com a senha inicial definida no .env do servidor (DEFAULT_USER_PASSWORD).");
        }
        return user.getSecurityQuestions().stream().map(SecurityQuestion::question).toList();
    }

    public void resetPassword(ResetPasswordRequest req) {
        User user = users.findByUsername(normalizeUsername(req.username()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RECOVERY_NOT_AVAILABLE));
        ensureNotLocked(user);
        PasswordPolicy.validate(req.newPassword(), user.getUsername());

        List<SecurityQuestion> questions = user.getSecurityQuestions();
        boolean allMatch = questions.size() == req.answers().size();
        for (int i = 0; allMatch && i < questions.size(); i++) {
            allMatch = encoder.matches(normalizeAnswer(req.answers().get(i)), questions.get(i).answerHash());
        }
        if (!allMatch) {
            user.setFailedRecoveryAttempts(user.getFailedRecoveryAttempts() + 1);
            lockIfNeeded(user, user.getFailedRecoveryAttempts());
            users.save(user);
            throw ApiException.badRequest("Uma ou mais respostas estão incorretas.");
        }

        user.setPasswordHash(encoder.encode(req.newPassword()));
        user.setFailedRecoveryAttempts(0);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        users.save(user);
    }

    public AccountResponse account(String userId) {
        User user = getUser(userId);
        return new AccountResponse(user.getUsername(),
                user.getSecurityQuestions().stream().map(SecurityQuestion::question).toList(),
                user.isPasswordChangeRequired(), user.isSetupRequired());
    }

    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = getUser(userId);
        checkCurrentPassword(user, req.currentPassword());
        PasswordPolicy.validate(req.newPassword(), user.getUsername());
        if (encoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("A nova senha deve ser diferente da atual.");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
        user.setPasswordChangeRequired(false);
        users.save(user);
    }

    public void changeQuestions(String userId, ChangeQuestionsRequest req) {
        User user = getUser(userId);
        checkCurrentPassword(user, req.currentPassword());
        user.setSecurityQuestions(hashQuestions(req.securityQuestions()));
        users.save(user);
    }

    private User getUser(String userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Não autenticado."));
    }

    private void checkCurrentPassword(User user, String password) {
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw ApiException.badRequest("Senha atual incorreta.");
        }
    }

    private List<SecurityQuestion> hashQuestions(List<QuestionAnswer> items) {
        var distinct = new HashSet<String>();
        for (QuestionAnswer qa : items) {
            if (!distinct.add(qa.question().trim().toLowerCase(Locale.ROOT))) {
                throw ApiException.badRequest("As perguntas de segurança devem ser diferentes entre si.");
            }
        }
        return items.stream()
                .map(qa -> new SecurityQuestion(qa.question().trim(), encoder.encode(normalizeAnswer(qa.answer()))))
                .toList();
    }

    private void ensureNotLocked(User user) {
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas inválidas. Tente novamente em alguns minutos.");
        }
    }

    private void lockIfNeeded(User user, int attempts) {
        if (attempts >= maxFailedAttempts) {
            user.setLockedUntil(Instant.now().plus(lockDuration));
            user.setFailedLoginAttempts(0);
            user.setFailedRecoveryAttempts(0);
        }
    }

    private static String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    /** Respostas comparadas sem diferenciar maiúsculas, acentos e espaços extras. */
    static String normalizeAnswer(String answer) {
        String noAccents = Normalizer.normalize(answer, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccents.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
