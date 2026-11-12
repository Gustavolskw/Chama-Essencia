import { Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { CandleComponent } from './candle.component';
import { ThemeToggleComponent } from './theme-toggle.component';

/** Logo completo (versão clara/escura) para as telas de login, cadastro e recuperação. */
@Component({
  selector: 'app-brand-logo',
  template: `
    <img class="logo" [src]="theme.isDark() ? 'brand/logo-dark.png' : 'brand/logo-light.png'"
         alt="Chama e Essência — Vela Aromática" width="360" height="225">
  `,
  styles: `
    :host { display: block; text-align: center; margin: -4px 0 8px; }
    .logo { width: min(280px, 80%); height: auto; animation: logo-in .9s ease both; }
    @keyframes logo-in { from { opacity: 0; transform: translateY(8px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
  `,
})
export class BrandLogoComponent {
  theme = inject(ThemeService);
}

/**
 * Fundo das telas de autenticação: fios de aroma subindo devagar, brasas flutuando e as folhas da marca.
 * Puramente decorativo.
 */
@Component({
  selector: 'app-aroma-backdrop',
  imports: [CandleComponent, ThemeToggleComponent],
  template: `
    <div class="backdrop-art" aria-hidden="true">
      <img class="leaf l1" [src]="theme.isDark() ? 'brand/leaf-dark.png' : 'brand/leaf-light.png'" alt="">
      <img class="leaf l2" [src]="theme.isDark() ? 'brand/leaf-dark.png' : 'brand/leaf-light.png'" alt="">
      <svg class="wisps" viewBox="0 0 400 600" preserveAspectRatio="xMidYMax slice">
        @for (w of wisps; track $index) {
          <path [attr.d]="w.d" [style.animation-delay.s]="w.delay" [style.animation-duration.s]="w.dur" />
        }
      </svg>
      @for (e of embers; track $index) {
        <span class="ember" [style.left.%]="e.x" [style.animation-delay.s]="e.delay" [style.animation-duration.s]="e.dur"></span>
      }
      <div class="candles">
        <app-candle [size]="30" [aroma]="true" />
        <app-candle [size]="22" [aroma]="true" />
        <app-candle [size]="26" [aroma]="true" />
      </div>
    </div>
    <div class="corner"><app-theme-toggle /></div>
  `,
  styles: `
    .backdrop-art { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
    .corner { position: fixed; top: 14px; right: 14px; z-index: 2; }
    .leaf { position: absolute; width: 150px; opacity: .55; animation: sway 9s ease-in-out infinite; transform-origin: 50% 100%; }
    .leaf.l1 { left: -20px; bottom: -40px; }
    .leaf.l2 { right: -10px; top: 40px; width: 110px; transform: scaleX(-1) rotate(160deg); animation-delay: -4s; opacity: .35; }
    .wisps { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 75%; }
    .wisps path { fill: none; stroke: var(--aroma); stroke-width: 1.4; stroke-linecap: round;
                  stroke-dasharray: 420; stroke-dashoffset: 420; opacity: 0; animation: rise ease-in-out infinite; }
    .ember { position: absolute; bottom: -10px; width: 5px; height: 5px; border-radius: 50%;
             background: radial-gradient(circle, var(--flame-tip), var(--flame-mid) 45%, transparent 70%);
             box-shadow: 0 0 8px var(--glow); opacity: 0; animation: float linear infinite; }
    .candles { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 18px; align-items: flex-end; opacity: .9; }
    @keyframes rise {
      0% { stroke-dashoffset: 420; opacity: 0; }
      30% { opacity: .55; }
      100% { stroke-dashoffset: -420; opacity: 0; }
    }
    @keyframes float {
      0% { transform: translate(0, 0); opacity: 0; }
      10% { opacity: .9; }
      100% { transform: translate(30px, -95vh); opacity: 0; }
    }
    @keyframes sway { 0%, 100% { rotate: -2deg; } 50% { rotate: 3deg; } }
    @media (max-width: 600px) { .leaf { width: 100px; } .candles { display: none; } }
  `,
})
export class AromaBackdropComponent {
  theme = inject(ThemeService);

  wisps = [
    { d: 'M60 600 C 20 500, 110 430, 60 340 S 30 200, 90 90', delay: 0, dur: 11 },
    { d: 'M200 600 C 240 520, 150 450, 210 360 S 250 220, 180 60', delay: 3.5, dur: 13 },
    { d: 'M330 600 C 290 510, 380 420, 320 330 S 290 180, 350 40', delay: 7, dur: 12 },
    { d: 'M130 600 C 170 520, 90 440, 140 350 S 170 210, 120 110', delay: 9.5, dur: 14 },
  ];

  embers = Array.from({ length: 9 }, (_, i) => ({ x: 8 + i * 10.5, delay: i * 1.7, dur: 9 + (i % 4) * 2.5 }));
}
