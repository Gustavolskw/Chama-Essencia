import { Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { CandleComponent } from './candle.component';

/** Alterna claro/escuro: no escuro a vela acende; no claro ela apaga e solta fumaça. */
@Component({
  selector: 'app-theme-toggle',
  imports: [CandleComponent],
  template: `
    <button type="button" class="toggle" (click)="theme.toggle()" [attr.aria-pressed]="theme.isDark()"
            [title]="theme.isDark() ? 'Modo claro (apagar a vela)' : 'Modo escuro (acender a vela)'"
            [attr.aria-label]="theme.isDark() ? 'Ativar modo claro' : 'Ativar modo escuro'">
      <app-candle [lit]="theme.isDark()" [size]="16" />
      <span class="label">{{ theme.isDark() ? 'Escuro' : 'Claro' }}</span>
    </button>
  `,
  styles: `
    .toggle {
      display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px 0 8px;
      border: 1px solid var(--border); border-radius: 999px; background: var(--surface-2); color: var(--muted);
      font: inherit; font-size: 12px; cursor: pointer; transition: border-color .3s, box-shadow .3s, color .3s;
    }
    .toggle:hover { color: var(--text); border-color: var(--rose); box-shadow: 0 0 14px var(--glow); }
    .toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @media (max-width: 520px) { .label { display: none; } .toggle { padding: 0 8px; } }
  `,
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
}
