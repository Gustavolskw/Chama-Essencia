import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const KEY = 'ce.theme';

function stored(): ThemeMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Modo claro / escuro. Sem escolha salva, segue o sistema operacional. O index.html aplica o mesmo
 * atributo antes do Angular subir, para a tela não "piscar" no tema errado.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  private readonly chosen = signal<ThemeMode | null>(stored());

  readonly mode = computed<ThemeMode>(() => this.chosen() ?? (this.systemDark() ? 'dark' : 'light'));
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    this.media?.addEventListener('change', e => this.systemDark.set(e.matches));
    effect(() => {
      const mode = this.mode();
      document.documentElement.dataset['theme'] = mode;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#1A1A1A' : '#722536');
    });
  }

  toggle(): void {
    const next: ThemeMode = this.isDark() ? 'light' : 'dark';
    this.chosen.set(next);
    try {
      localStorage.setItem(KEY, next);
    } catch { /* fica só nesta sessão */ }
  }
}
