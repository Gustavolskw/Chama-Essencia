import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { CandleComponent } from './shared/candle.component';
import { ThemeToggleComponent } from './shared/theme-toggle.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CandleComponent, ThemeToggleComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="topbar">
        <a class="brand" routerLink="/producao" aria-label="Chama e Essência — início">
          <app-candle [size]="20" [aroma]="true" />
          <span class="wordmark">
            <span class="name">Chama e Essência</span>
            <span class="tagline">Vela Aromática</span>
          </span>
        </a>
        <button class="menu-toggle icon-btn" type="button" (click)="menuOpen.set(!menuOpen())"
                [attr.aria-expanded]="menuOpen()" aria-controls="main-nav" aria-label="Menu">☰</button>
        <nav id="main-nav" [class.open]="menuOpen()">
          @if (!auth.setupRequired()) {
            @for (l of links; track l.path; let i = $index) {
              <a [routerLink]="l.path" routerLinkActive="active" [style.--i]="i">
                <span class="flame" aria-hidden="true"></span>{{ l.label }}
              </a>
            }
          }
        </nav>
        <span class="user">
          <app-theme-toggle />
          <a routerLink="/perfil" routerLinkActive="active" title="Meu perfil">{{ auth.username() }}</a>
          <button class="btn ghost small" (click)="auth.logout()">Sair</button>
        </span>
        <span class="wick-line" aria-hidden="true"></span>
      </header>
    }
    <main><router-outlet /></main>
  `,
  styles: `
    .topbar {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 10px 20px; position: sticky; top: 0; z-index: 5;
      background: color-mix(in srgb, var(--surface) 88%, transparent);
      backdrop-filter: blur(10px); border-bottom: 1px solid var(--border);
      transition: background-color .4s ease;
    }
    /* Linha inferior com um brilho quente que percorre o menu, como a luz de uma vela. */
    .wick-line {
      position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; pointer-events: none;
      background: linear-gradient(90deg, transparent 0%, var(--flame-mid) 45%, var(--brand) 55%, transparent 100%);
      background-size: 40% 100%; background-repeat: no-repeat; opacity: .7;
      animation: travel 9s ease-in-out infinite;
    }
    @keyframes travel { 0% { background-position: -40% 0; } 50% { background-position: 140% 0; } 100% { background-position: -40% 0; } }

    .brand { display: flex; align-items: flex-end; gap: 8px; color: var(--text); text-decoration: none; }
    .brand app-candle { margin-bottom: 1px; }
    .wordmark { display: flex; flex-direction: column; line-height: 1.05; }
    .name { font-family: var(--font-brand); font-size: 19px; font-weight: 500; color: var(--accent); letter-spacing: .3px; }
    .tagline { font-size: 10.5px; color: var(--muted); letter-spacing: 1.6px; text-transform: uppercase; }

    nav { display: flex; gap: 2px; flex: 1; flex-wrap: wrap; }
    nav a {
      position: relative; display: inline-flex; align-items: center; padding: 7px 12px 7px 20px; border-radius: 999px;
      color: var(--muted); text-decoration: none; white-space: nowrap; transition: color .3s, background-color .3s;
    }
    /* Pavio: um ponto discreto que "acende" ao passar o mouse e vira chama no item ativo. */
    nav a .flame {
      position: absolute; left: 8px; top: 50%; width: 6px; height: 9px; margin-top: -5px;
      border-radius: 50% 50% 45% 45% / 62% 62% 38% 38%;
      background: radial-gradient(ellipse at 50% 70%, var(--flame-tip) 0 25%, var(--flame-mid) 45%, var(--flame-outer) 75%, transparent 80%);
      transform: scale(.35); opacity: .25; filter: grayscale(1); transform-origin: 50% 100%;
      transition: transform .35s cubic-bezier(.2, 1.5, .4, 1), opacity .3s, filter .3s;
    }
    nav a::after {
      content: ""; position: absolute; left: 50%; right: 50%; bottom: 3px; height: 2px; border-radius: 2px;
      background: linear-gradient(90deg, transparent, var(--flame-mid), var(--brand), var(--flame-mid), transparent);
      transition: left .35s ease, right .35s ease;
    }
    nav a:hover { color: var(--text); }
    nav a:hover::after { left: 14px; right: 10px; }
    nav a:hover .flame { transform: scale(.8); opacity: .85; filter: none; }
    nav a.active { color: var(--accent); background: var(--accent-soft); font-weight: 600; animation: warm 3.2s ease-in-out infinite; }
    nav a.active .flame { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 4px var(--glow)); animation: tiny-flicker 1.9s ease-in-out infinite; }
    @keyframes tiny-flicker {
      0%, 100% { transform: scale(1, 1) rotate(0); }
      30% { transform: scale(.92, 1.08) rotate(3deg); }
      60% { transform: scale(1.05, .94) rotate(-2deg); }
    }
    @keyframes warm { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 14px -2px var(--glow); } }

    .user { display: flex; align-items: center; gap: 10px; color: var(--muted); }
    .user > a { color: var(--muted); text-decoration: none; padding: 6px 10px; border-radius: 999px; transition: color .3s; }
    .user > a:hover { color: var(--text); }
    .user > a.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .menu-toggle { display: none; margin-left: auto; }
    main { max-width: 1240px; margin: 0 auto; padding: 22px 16px 48px; }

    @media (max-width: 980px) {
      .menu-toggle { display: inline-block; }
      nav { display: none; flex-basis: 100%; flex-direction: column; order: 3; padding-top: 4px; }
      nav.open { display: flex; }
      /* Itens entram em sequência, como velas sendo acesas uma a uma. */
      nav.open a { animation: light-up .4s ease both; animation-delay: calc(var(--i) * 55ms); }
      nav.open a.active { animation: light-up .4s ease both, warm 3.2s ease-in-out .4s infinite; animation-delay: calc(var(--i) * 55ms), .4s; }
      .user { order: 2; }
      .tagline { display: none; }
    }
    @keyframes light-up { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  /** Instancia o tema logo no início (aplica data-theme e acompanha o sistema). */
  theme = inject(ThemeService);
  menuOpen = signal(false);

  links = [
    { path: '/producao', label: 'Produção' },
    { path: '/estoque', label: 'Estoque' },
    { path: '/vendas', label: 'Vendas' },
    { path: '/balanco', label: 'Balanço' },
    { path: '/estimativa', label: 'Estimativa' },
    { path: '/configuracoes', label: 'Margens e config.' },
    { path: '/ajuda', label: 'Ajuda / FAQ' },
  ];

  constructor() {
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }
}
