package com.chamaessencia.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.chamaessencia.auth.AuthDtos.QuestionAnswer;
import com.chamaessencia.auth.AuthDtos.RegisterRequest;
import com.chamaessencia.common.ApiException;
import com.chamaessencia.config.JwtService;
import com.chamaessencia.user.User;
import com.chamaessencia.user.UserRepository;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

/**
 * Segurança: o cadastro pela API nunca pode criar usuário sem um código de convite válido
 * (a loja é única e todos os usuários enxergam os mesmos dados).
 */
class RegisterRequiresInviteTest {

    private static final List<QuestionAnswer> QUESTIONS = List.of(
            new QuestionAnswer("Pergunta A?", "aa"),
            new QuestionAnswer("Pergunta B?", "bb"),
            new QuestionAnswer("Pergunta C?", "cc"));

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static RegisterRequest request(String inviteCode) {
        return new RegisterRequest("novo_usuario", "Senha@Forte1", QUESTIONS, inviteCode);
    }

    static Stream<Arguments> missingCodes() {
        return Stream.of(Arguments.of((String) null), Arguments.of(""), Arguments.of("   "));
    }

    /** A validação da requisição (@Valid no controller) recusa cadastro sem código. */
    @ParameterizedTest
    @MethodSource("missingCodes")
    void requisicaoSemCodigoEhInvalida(String code) {
        assertFalse(validator.validate(request(code)).isEmpty());
    }

    /** Mesmo que a validação fosse contornada, o serviço exige um convite válido antes de gravar. */
    @Test
    void codigoInvalidoNaoGravaUsuario() {
        UserRepository users = mock(UserRepository.class);
        InviteService invites = mock(InviteService.class);
        when(users.existsByUsername(anyString())).thenReturn(false);
        doThrow(ApiException.badRequest("Código de convite inválido, expirado ou já utilizado."))
                .when(invites).consume(any(), anyString());
        AuthService service = new AuthService(users, new BCryptPasswordEncoder(4),
                new JwtService("segredo-de-teste-com-mais-de-32-caracteres", 1), invites, 5, 15);

        assertThrows(ApiException.class, () -> service.register(request("ABCDE-FGHJK")));
        assertThrows(ApiException.class, () -> service.register(request(null)));
        verify(users, never()).save(any(User.class));
    }

    /** Sem código, o serviço de convites recusa (nunca considera um código vazio como válido). */
    @Test
    void servicoDeConviteRecusaCodigoAusente() {
        InviteService invites = new InviteService(mock(org.springframework.data.mongodb.core.MongoTemplate.class));
        assertThrows(ApiException.class, () -> invites.consume(null, "x"));
        assertThrows(ApiException.class, () -> invites.consume("  ", "x"));
    }
}
