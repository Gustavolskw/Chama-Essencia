package com.chamaessencia.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import com.chamaessencia.auth.AuthDtos.InviteResponse;
import com.chamaessencia.common.ApiException;

/**
 * Convites de cadastro. A empresa é única: todos os usuários enxergam os mesmos dados, então só entra
 * quem recebeu um código de uso único (válido por 48 h) gerado por um usuário já logado.
 * O código é guardado apenas como hash SHA-256.
 */
@Service
public class InviteService {

    private static final Duration VALIDITY = Duration.ofHours(48);
    /** Sem caracteres ambíguos (0/O, 1/I/L). */
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Document("invites")
    public static class Invite {
        @Id
        private String id;
        @Indexed(unique = true)
        private String codeHash;
        private String createdBy;
        private Instant createdAt = Instant.now();
        private Instant expiresAt;
        private String usedBy;
        private Instant usedAt;

        public String getId() { return id; }
        public String getCodeHash() { return codeHash; }
        public Instant getExpiresAt() { return expiresAt; }
        public String getUsedBy() { return usedBy; }
    }

    private final MongoTemplate mongo;

    public InviteService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public InviteResponse create(String userId) {
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            if (i == 5) {
                code.append('-');
            }
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        Invite invite = new Invite();
        invite.codeHash = hash(code.toString());
        invite.createdBy = userId;
        invite.expiresAt = Instant.now().plus(VALIDITY);
        mongo.save(invite);
        return new InviteResponse(code.toString(), invite.expiresAt);
    }

    /** Marca o convite como usado de forma atômica; falha se inválido, expirado ou já usado. */
    public void consume(String code, String username) {
        if (code == null || code.isBlank()) {
            throw ApiException.badRequest("Informe o código de convite gerado por um usuário da loja.");
        }
        Query query = Query.query(Criteria.where("codeHash").is(hash(code))
                .and("usedBy").is(null)
                .and("expiresAt").gt(Instant.now()));
        Update update = new Update().set("usedBy", username).set("usedAt", Instant.now());
        Invite used = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), Invite.class);
        if (used == null) {
            throw ApiException.badRequest("Código de convite inválido, expirado ou já utilizado.");
        }
    }

    private static String hash(String code) {
        String normalized = code.trim().toUpperCase(Locale.ROOT).replace("-", "").replace(" ", "");
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
