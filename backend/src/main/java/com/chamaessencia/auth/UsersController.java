package com.chamaessencia.auth;

import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.auth.AuthDtos.InviteResponse;
import com.chamaessencia.auth.AuthDtos.UserResponse;
import com.chamaessencia.common.ApiException;
import com.chamaessencia.common.CurrentUser;
import com.chamaessencia.user.User;
import com.chamaessencia.user.UserRepository;

/** Usuários da loja (todos com o mesmo acesso) e convites para novos usuários. */
@RestController
@RequestMapping("/api/users")
public class UsersController {

    private final UserRepository users;
    private final InviteService invites;

    public UsersController(UserRepository users, InviteService invites) {
        this.users = users;
        this.invites = invites;
    }

    @GetMapping
    public List<UserResponse> list() {
        String me = CurrentUser.id();
        return users.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt))
                .map(u -> new UserResponse(u.getId(), u.getUsername(), u.getCreatedAt(), u.getId().equals(me)))
                .toList();
    }

    @PostMapping("/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteResponse invite() {
        return invites.create(CurrentUser.id());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String id) {
        if (id.equals(CurrentUser.id())) {
            throw ApiException.badRequest("Você não pode remover o próprio usuário.");
        }
        if (!users.existsById(id)) {
            throw ApiException.notFound("Usuário não encontrado.");
        }
        users.deleteById(id);
    }
}
