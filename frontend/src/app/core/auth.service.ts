import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { QuestionAnswer } from './models';

interface TokenResponse {
  token: string;
  username: string;
  /** Primeiro acesso pendente: trocar a senha inicial e/ou cadastrar as perguntas de segurança. */
  setupRequired: boolean;
}

const TOKEN_KEY = 'ce.token';
const USER_KEY = 'ce.username';
const SETUP_KEY = 'ce.setup';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(read(TOKEN_KEY));
  readonly username = signal<string | null>(read(USER_KEY));
  readonly setupRequired = signal<boolean>(read(SETUP_KEY) === '1');
  readonly isLoggedIn = computed(() => !!this.token());

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/login', { username, password })
      .pipe(tap(r => this.store(r)));
  }

  register(username: string, password: string, securityQuestions: QuestionAnswer[],
           inviteCode: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/register', { username, password, securityQuestions, inviteCode })
      .pipe(tap(r => this.store(r)));
  }

  recoveryQuestions(username: string): Observable<{ questions: string[] }> {
    return this.http.get<{ questions: string[] }>(`/api/auth/recovery/${encodeURIComponent(username)}`);
  }

  resetPassword(username: string, answers: string[], newPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/recovery/reset', { username, answers, newPassword });
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
    this.setupRequired.set(false);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SETUP_KEY);
    } catch { /* armazenamento indisponível */ }
    this.router.navigate(['/login']);
  }

  /** Atualiza a pendência de primeiro acesso (após trocar a senha / cadastrar as perguntas). */
  setSetupRequired(required: boolean): void {
    this.setupRequired.set(required);
    try {
      if (required) localStorage.setItem(SETUP_KEY, '1'); else localStorage.removeItem(SETUP_KEY);
    } catch { /* armazenamento indisponível */ }
  }

  private store(r: TokenResponse): void {
    this.token.set(r.token);
    this.username.set(r.username);
    this.setSetupRequired(r.setupRequired);
    try {
      localStorage.setItem(TOKEN_KEY, r.token);
      localStorage.setItem(USER_KEY, r.username);
    } catch { /* sessão fica só em memória */ }
  }
}
