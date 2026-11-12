package com.chamaessencia.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.auth.AuthDtos.AccountResponse;
import com.chamaessencia.auth.AuthDtos.ChangePasswordRequest;
import com.chamaessencia.auth.AuthDtos.ChangeQuestionsRequest;
import com.chamaessencia.auth.AuthDtos.LoginRequest;
import com.chamaessencia.auth.AuthDtos.RecoveryQuestionsResponse;
import com.chamaessencia.auth.AuthDtos.RegisterRequest;
import com.chamaessencia.auth.AuthDtos.ResetPasswordRequest;
import com.chamaessencia.auth.AuthDtos.TokenResponse;
import com.chamaessencia.common.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/auth/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/auth/recovery/{username}")
    public RecoveryQuestionsResponse recoveryQuestions(@PathVariable String username) {
        return new RecoveryQuestionsResponse(authService.recoveryQuestions(username));
    }

    @PostMapping("/auth/recovery/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
    }

    @GetMapping("/account")
    public AccountResponse account() {
        return authService.account(CurrentUser.id());
    }

    @PutMapping("/account/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(CurrentUser.id(), req);
    }

    @PutMapping("/account/security-questions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeQuestions(@Valid @RequestBody ChangeQuestionsRequest req) {
        authService.changeQuestions(CurrentUser.id(), req);
    }
}
