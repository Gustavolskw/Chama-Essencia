import { Component, input } from '@angular/core';

let seq = 0;

/**
 * Vela em SVG. Acesa: chama tremulando com brilho quente; com "aroma", fios de essência sobem da chama.
 * Apagada: pavio escuro soltando um fio de fumaça. Respeita "reduzir movimento" do sistema (styles.css).
 */
@Component({
  selector: 'app-candle',
  template: `
    <svg [attr.width]="size()" [attr.height]="size() * 1.6" viewBox="0 0 30 48" aria-hidden="true"
         [class.lit]="lit()" [class.aroma]="aroma()">
      <defs>
        <radialGradient [attr.id]="id + 'glow'" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--flame-mid)" stop-opacity=".55" />
          <stop offset="100%" stop-color="var(--flame-mid)" stop-opacity="0" />
        </radialGradient>
        <linearGradient [attr.id]="id + 'flame'" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="var(--flame-outer)" />
          <stop offset="55%" stop-color="var(--flame-mid)" />
          <stop offset="100%" stop-color="var(--flame-tip)" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'wax'" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--wax-shade)" />
          <stop offset="45%" stop-color="var(--wax)" />
          <stop offset="100%" stop-color="var(--wax-shade)" />
        </linearGradient>
      </defs>

      <!-- fios de aroma / fumaça -->
      <g class="wisps" fill="none" stroke-linecap="round">
        <path class="w1" d="M15 16 C 11 12, 19 9, 15 4 S 13 -2, 16 -6" />
        <path class="w2" d="M15 16 C 19 12, 11 9, 16 4 S 18 -1, 14 -6" />
      </g>

      <circle class="glow" cx="15" cy="15" r="13" [attr.fill]="'url(#' + id + 'glow)'" />

      <!-- pote/corpo da vela -->
      <rect x="6.5" y="26" width="17" height="19" rx="3" [attr.fill]="'url(#' + id + 'wax)'" />
      <ellipse cx="15" cy="26" rx="8.5" ry="2.2" fill="var(--wax)" />
      <path d="M9 26.5 q0 4 1.4 4 q1.4 0 1.4 -3.2" fill="var(--wax)" />
      <rect x="6.5" y="38" width="17" height="2.2" fill="var(--brand)" opacity=".9" />

      <!-- pavio -->
      <path d="M15 26 q-.4 -2 .3 -4" stroke="var(--wick)" stroke-width="1.3" fill="none" stroke-linecap="round" />

      <!-- chama -->
      <g class="flame">
        <path d="M15 8 C 18.5 12.5, 19.5 16, 17.6 19.4 C 16.6 21.2, 13.4 21.2, 12.4 19.4 C 10.5 16, 11.5 12.5, 15 8 Z"
              [attr.fill]="'url(#' + id + 'flame)'" />
        <ellipse cx="15" cy="17.6" rx="1.6" ry="2.6" fill="var(--flame-core)" />
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; line-height: 0; }
    svg { overflow: visible; }
    .flame, .glow { transform-box: fill-box; transform-origin: 50% 100%; opacity: 0; transform: scale(.2); }
    .glow { transform-origin: 50% 50%; }
    svg.lit .flame {
      opacity: 1; transform: scale(1);
      animation: ignite .55s cubic-bezier(.2, 1.4, .4, 1) both, flicker 2.6s ease-in-out .55s infinite;
    }
    svg.lit .glow { opacity: 1; transform: scale(1); animation: glow 2.6s ease-in-out infinite; }

    .wisps path { stroke: var(--smoke); stroke-width: 1.1; stroke-dasharray: 26; stroke-dashoffset: 26; opacity: 0; }
    /* Apagada: um fio de fumaça subindo do pavio. */
    svg:not(.lit) .w1 { animation: smoke 3.2s ease-out infinite; }
    /* Acesa com aroma: dois fios de essência, alternados. */
    svg.lit.aroma .wisps path { stroke: var(--aroma); stroke-width: .9; }
    svg.lit.aroma .w1 { animation: smoke 4.6s ease-in-out .4s infinite; }
    svg.lit.aroma .w2 { animation: smoke 4.6s ease-in-out 2.7s infinite; }
    svg.lit.aroma .wisps { transform: translateY(-9px); }

    @keyframes ignite {
      0% { opacity: 0; transform: scale(.1, .1); }
      60% { opacity: 1; transform: scale(1.15, 1.25); }
      100% { transform: scale(1); }
    }
    @keyframes flicker {
      0%, 100% { transform: scale(1, 1) skewX(0); }
      20% { transform: scale(.96, 1.06) skewX(2deg); }
      40% { transform: scale(1.03, .95) skewX(-1.5deg); }
      60% { transform: scale(.98, 1.04) skewX(1deg); }
      80% { transform: scale(1.02, .97) skewX(-2deg); }
    }
    @keyframes glow {
      0%, 100% { opacity: .85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.12); }
    }
    @keyframes smoke {
      0% { stroke-dashoffset: 26; opacity: 0; transform: translateY(0); }
      25% { opacity: .7; }
      100% { stroke-dashoffset: -26; opacity: 0; transform: translateY(-6px); }
    }
  `,
})
export class CandleComponent {
  lit = input(true);
  /** Fios de essência subindo da chama acesa. */
  aroma = input(false);
  /** Largura em px (a altura é 1,6×). */
  size = input(20);

  readonly id = `cdl${++seq}`;
}
