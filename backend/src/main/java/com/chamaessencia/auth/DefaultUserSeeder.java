package com.chamaessencia.auth;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.chamaessencia.user.User;
import com.chamaessencia.user.UserRepository;

/**
 * Cria o usuário padrão da loja (chama_e_essencia) quando o banco não tem nenhum usuário. É com ele que se
 * entra pela primeira vez e se geram os convites para as outras pessoas (o cadastro sempre exige convite).
 * A senha inicial vem do .env (DEFAULT_USER_PASSWORD); no primeiro login o sistema exige trocar a senha
 * e cadastrar as 3 perguntas de segurança.
 */
@Component
public class DefaultUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DefaultUserSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String username;
    private final String password;

    public DefaultUserSeeder(UserRepository users, PasswordEncoder encoder,
                             @Value("${app.default-user.username:chama_e_essencia}") String username,
                             @Value("${app.default-user.password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.username = username.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        boolean generated = password == null || password.isBlank();
        String initial = generated ? randomPassword() : password;
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(initial));
        user.setPasswordChangeRequired(true);
        users.save(user);
        if (generated) {
            log.warn("Usuário padrão '{}' criado com a senha inicial gerada: {}  (defina DEFAULT_USER_PASSWORD no .env)",
                    username, initial);
        } else {
            log.info("Usuário padrão '{}' criado com a senha inicial de DEFAULT_USER_PASSWORD.", username);
        }
    }

    private static String randomPassword() {
        byte[] bytes = new byte[9];
        new SecureRandom().nextBytes(bytes);
        return "Ce@" + HexFormat.of().formatHex(bytes);
    }
}
