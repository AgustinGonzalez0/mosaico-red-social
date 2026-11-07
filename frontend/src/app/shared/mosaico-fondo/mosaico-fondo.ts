import { Component, input } from '@angular/core';

const COLORES = ['#ffd6dc', '#ffe8c7', '#d6ecff', '#e0f5df', '#eadcff', '#fff3b8'];
const ALTOS = [180, 260, 220, 300, 200, 240, 280, 190, 250, 210, 270, 230];

/**
 * Fondo decorativo estilo muro de pines. Se usa en login, registro, pantalla de carga y feed.
 * Va fijo detrás de todo el contenido (z-index -1) y no intercepta clics.
 * Con `suave` se desenfoca y aclara un poco para que el contenido destaque (feed).
 */
@Component({
  selector: 'app-mosaico-fondo',
  template: `
    <div class="muro" [class.suave]="suave()" aria-hidden="true">
      @for (t of tiles; track $index) {
        <div class="tile" [style.height.px]="t.alto" [style.background]="t.color"></div>
      }
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      background: #fff;
      pointer-events: none;
      user-select: none;
    }
    .muro {
      columns: 6 180px;
      column-gap: 16px;
      padding: 16px;
      opacity: 0.75;
    }
    .muro.suave {
      opacity: 0.55;
      filter: blur(2px);
      /* El desenfoque deja bordes claros; se agranda un poco para que no se vean en los márgenes. */
      transform: scale(1.03);
    }
    .tile {
      break-inside: avoid;
      margin-bottom: 16px;
      border-radius: 24px;
    }
  `,
})
export class MosaicoFondo {
  readonly suave = input(false);

  protected readonly tiles = Array.from({ length: 36 }, (_, i) => ({
    alto: ALTOS[(i * 5) % ALTOS.length],
    color: COLORES[(i * 7 + (i >> 2)) % COLORES.length],
  }));
}
