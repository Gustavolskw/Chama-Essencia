import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account } from '../core/models';
import { errorMessage } from '../core/auth.interceptor';
import { passwordValid } from '../core/password';
import { PasswordInputComponent } from '../shared/password-input.component';
import { PasswordRulesComponent } from '../shared/password-rules.component';
import { SecurityQuestionsComponent, emptyQuestions, questionsValid } from '../shared/security-questions.component';

/** Gestão do perfil: troca de senha e das perguntas de segurança, sempre confirmando a senha atual. */
@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink, SecurityQuestionsComponent, PasswordInputComponent, PasswordRulesComponent],
  template: `
    <div class="page-head">
      <h1>Meu perfil</h1>
      <p class="sub">Usuário: <strong>{{ username() }}</strong></p>
    </div>

    @if (account(); as a) {
      @if (a.setupRequired) {
        <div class="warning">
          <strong>Primeiro acesso.</strong> Antes de usar o sistema:
          <ul>
            <li [class.done]="!a.passwordChangeRequired">{{ a.passwordChangeRequired ? '•' : '✓' }} troque a senha inicial;</li>
            <li [class.done]="a.securityQuestions.length > 0">{{ a.securityQuestions.length ? '✓' : '•' }} cadastre as 3 perguntas de segurança (são a única forma de recuperar a senha).</li>
          </ul>
        </div>
      } @else if (justFinished()) {
        <div class="success">Tudo pronto! <a routerLink="/producao">Ir para a produção</a> ou gere convites para outras
          pessoas em <a routerLink="/configuracoes">Margens e config. → Usuários</a>.</div>
      }
    }

    <div class="grid">
      <section class="card">
        <h2>Alterar senha</h2>
        @if (pwdMsg()) { <div [class]="pwdOk() ? 'success' : 'error'">{{ pwdMsg() }}</div> }
        <form (ngSubmit)="changePassword()">
          <div class="field">
            <label for="cur">Senha atual</label>
            <app-password-input inputId="cur" name="cur" [(ngModel)]="pwd.current" autocomplete="current-password" />
          </div>
          <div class="field">
            <label for="new">Nova senha</label>
            <app-password-input inputId="new" name="new" [(ngModel)]="pwd.next" autocomplete="new-password"
                                [invalid]="!!pwd.next && !passwordValid(pwd.next, username())" />
            <app-password-rules [password]="pwd.next" [username]="username()" />
          </div>
          <div class="field">
            <label for="conf">Confirmar nova senha</label>
            <app-password-input inputId="conf" name="conf" [(ngModel)]="pwd.confirm" autocomplete="new-password"
                                [invalid]="!!pwd.confirm && pwd.confirm !== pwd.next" />
          </div>
          <button class="btn" type="submit" [disabled]="!pwd.current">Alterar senha</button>
        </form>
      </section>

      <section class="card">
        <h2>Perguntas de segurança</h2>
        @if (currentQuestions().length) {
          <p class="hint">Atuais:</p>
          <ol class="current">
            @for (q of currentQuestions(); track $index) { <li>{{ q }}</li> }
          </ol>
        }
        @if (qMsg()) { <div [class]="qOk() ? 'success' : 'error'">{{ qMsg() }}</div> }
        @if (!editingQuestions() && currentQuestions().length) {
          <button class="btn ghost" type="button" (click)="editingQuestions.set(true)">Alterar perguntas</button>
        } @else {
          <form (ngSubmit)="changeQuestions()">
            <app-security-questions [items]="questions" />
            <div class="field">
              <label for="qpwd">Senha atual (confirmação)</label>
              <app-password-input inputId="qpwd" name="qpwd" [(ngModel)]="questionsPassword" autocomplete="current-password" />
            </div>
            <div class="form-actions">
              @if (currentQuestions().length) {
                <button class="btn ghost" type="button" (click)="cancelQuestions()">Cancelar</button>
              }
              <button class="btn" type="submit" [disabled]="!questionsPassword">Salvar perguntas</button>
            </div>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .current { margin: 4px 0 14px; padding-left: 20px; color: var(--muted); }
    .warning ul { list-style: none; margin: 6px 0 0; padding: 0; }
    .warning li.done { color: var(--ok); }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  account = signal<Account | null>(null);
  justFinished = signal(false);
  readonly passwordValid = passwordValid;
  username = signal('');
  currentQuestions = signal<string[]>([]);

  pwd = { current: '', next: '', confirm: '' };
  pwdMsg = signal('');
  pwdOk = signal(true);

  editingQuestions = signal(false);
  questions = emptyQuestions();
  questionsPassword = '';
  qMsg = signal('');
  qOk = signal(true);

  ngOnInit(): void {
    this.refresh();
  }

  /** Recarrega a conta e libera o sistema quando o primeiro acesso termina. */
  private refresh(): void {
    const wasPending = this.auth.setupRequired();
    this.api.account().subscribe(a => {
      this.account.set(a);
      this.username.set(a.username);
      this.currentQuestions.set(a.securityQuestions);
      this.editingQuestions.set(a.securityQuestions.length === 0);
      this.auth.setSetupRequired(a.setupRequired);
      this.justFinished.set(wasPending && !a.setupRequired);
    });
  }

  changePassword(): void {
    const fail = (m: string) => { this.pwdOk.set(false); this.pwdMsg.set(m); };
    if (!passwordValid(this.pwd.next, this.username())) return fail('A nova senha não atende a todas as regras.');
    if (this.pwd.next !== this.pwd.confirm) return fail('As senhas não conferem.');
    this.api.changePassword(this.pwd.current, this.pwd.next).subscribe({
      next: () => {
        this.pwd = { current: '', next: '', confirm: '' };
        this.pwdOk.set(true);
        this.pwdMsg.set('Senha alterada.');
        this.refresh();
      },
      error: err => fail(errorMessage(err)),
    });
  }

  cancelQuestions(): void {
    this.editingQuestions.set(false);
    this.questions = emptyQuestions();
    this.questionsPassword = '';
  }

  changeQuestions(): void {
    const fail = (m: string) => { this.qOk.set(false); this.qMsg.set(m); };
    if (!questionsValid(this.questions)) {
      return fail('Preencha 3 perguntas diferentes, cada uma com resposta de pelo menos 2 caracteres.');
    }
    this.api.changeQuestions(this.questionsPassword, this.questions).subscribe({
      next: () => {
        this.cancelQuestions();
        this.qOk.set(true);
        this.qMsg.set('Perguntas de segurança salvas.');
        this.refresh();
      },
      error: err => fail(errorMessage(err)),
    });
  }
}
