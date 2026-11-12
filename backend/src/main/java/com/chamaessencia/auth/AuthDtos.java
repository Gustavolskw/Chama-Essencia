package com.chamaessencia.auth;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record QuestionAnswer(
            @NotBlank @Size(max = 200) String question,
            @NotBlank @Size(min = 2, max = 200) String answer) {
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 40)
            @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "use apenas letras, números, ponto, hífen ou sublinhado")
            String username,
            @NotBlank String password,
            @NotNull @Size(min = 3, max = 3, message = "informe exatamente 3 perguntas de segurança")
            List<@Valid QuestionAnswer> securityQuestions,
            /** Código gerado por um usuário que já tem acesso (o primeiro é o usuário padrão). */
            @NotBlank(message = "informe o código de convite") @Size(max = 40) String inviteCode) {
    }

    public record InviteResponse(String code, java.time.Instant expiresAt) {
    }

    public record UserResponse(String id, String username, java.time.Instant createdAt, boolean you) {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    /** setupRequired = precisa trocar a senha inicial e/ou cadastrar as perguntas antes de usar o sistema. */
    public record TokenResponse(String token, String username, boolean setupRequired) {
    }

    public record RecoveryQuestionsResponse(List<String> questions) {
    }

    public record ResetPasswordRequest(
            @NotBlank String username,
            @NotNull @Size(min = 3, max = 3) List<@NotBlank String> answers,
            @NotBlank String newPassword) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank String newPassword) {
    }

    public record ChangeQuestionsRequest(
            @NotBlank String currentPassword,
            @NotNull @Size(min = 3, max = 3, message = "informe exatamente 3 perguntas de segurança")
            List<@Valid QuestionAnswer> securityQuestions) {
    }

    public record AccountResponse(String username, List<String> securityQuestions, boolean passwordChangeRequired,
                                  boolean setupRequired) {
    }
}
