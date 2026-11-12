import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { passwordValid } from '../core/password';
import { AromaBackdropComponent, BrandLogoComponent } from '../shared/brand.component';
import { PasswordInputComponent } from '../shared/password-input.component';
import { PasswordRulesComponent } from '../shared/password-rules.component';
import { SecurityQuestionsComponent, emptyQuestions, questionsValid } from '../shared/security-questions.component';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AromaBackdropComponent, BrandLogoComponent, SecurityQuestionsComponent, PasswordInputComponent, PasswordRulesComponent],
  template: `
    <app-aroma-backdrop />
    <div class="auth-page card">
      <app-brand-logo />
      <h1>Criar conta</h1>
      <p class="sub">A loja é única e todos os usuários enxergam os mesmos dados. Peça um código de convite a quem já
        tem acesso (em "Margens e config. → Usuários").</p>
      @if (error()) { <div class="error">{{ error() }}</div> }
      <form (ngSubmit)="submit()">
        <div class="field">
          <label for="inv">Código de convite</label>
          <input id="inv" name="inv" [(ngModel)]="invite" autocomplete="off" autocapitalize="characters"
                 placeholder="XXXXX-XXXXX" spellcheck="false" required>
        </div>
        <div class="field">
          <label for="u">Usuário</label>
          <input id="u" name="u" [(ngModel)]="username" autocomplete="username" required
                 autocapitalize="off" spellcheck="false" aria-describedby="u-hint"
                 [attr.aria-invalid]="usernameProblem() ? true : null">
          @if (usernameProblem(); as problem) {
            <p id="u-hint" class="hint mismatch">{{ problem }}</p>
          } @else {
            <p id="u-hint" class="hint">Letras, números, ponto, hífen ou sublinhado (3 a 40), sem espaços.</p>
          }
        </div>
        <div class="field">
          <label for="p">Senha</label>
          <app-password-input inputId="p" name="p" [(ngModel)]="password" autocomplete="new-password"
                              [invalid]="!!password && !passwordOk()" />
          <app-password-rules [password]="password" [username]="username" />
        </div>
        <div class="field">
          <label for="c">Confirmar senha</label>
          <app-password-input inputId="c" name="c" [(ngModel)]="confirm" autocomplete="new-password"
                              [invalid]="!!confirm && confirm !== password" />
          @if (confirm && confirm !== password) { <p class="hint mismatch">As senhas não conferem.</p> }
        </div>
        <h3>Perguntas de segurança</h3>
        <app-security-questions [items]="questions" />
        <button class="btn" type="submit" [disabled]="loading()" style="margin-top: 12px">Criar conta</button>
      </form>
      <div class="links"><a routerLink="/login">Já tenho conta</a></div>
    </div>
  `,
  styles: `.mismatch { color: var(--danger); }`,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  invite = '';
  username = '';
  password = '';
  confirm = '';
  questions = emptyQuestions();
  loading = signal(false);
  error = signal('');

  usernameOk(): boolean {
    return USERNAME_PATTERN.test(this.username.trim());
  }

  usernameProblem(): string | null {
    const u = this.username.trim();
    if (!u || this.usernameOk()) return null;
    if (/\s/.test(u)) return 'O usuário não pode ter espaços.';
    if (/[^a-zA-Z0-9._-]/.test(u)) return 'Use apenas letras sem acento, números, ponto, hífen ou sublinhado.';
    if (u.length < 3) return 'O usuário precisa ter pelo menos 3 caracteres.';
    return 'O usuário pode ter no máximo 40 caracteres.';
  }

  passwordOk(): boolean {
    return passwordValid(this.password, this.username);
  }

  submit(): void {
    if (!this.invite.trim()) return this.error.set('Informe o código de convite.');
    if (!this.usernameOk()) return this.error.set(this.usernameProblem() ?? 'Informe o nome de usuário.');
    if (!this.passwordOk()) return this.error.set('A senha não atende a todas as regras.');
    if (this.password !== this.confirm) return this.error.set('As senhas não conferem.');
    if (!questionsValid(this.questions)) {
      return this.error.set('Preencha 3 perguntas diferentes, cada uma com resposta de pelo menos 2 caracteres.');
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.username.trim(), this.password, this.questions, this.invite.trim()).subscribe({
      next: () => this.router.navigate(['/producao']),
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
