import { Component, input, output } from '@angular/core';
import { MosaicoFondo } from '../mosaico-fondo/mosaico-fondo';

/**
 * Pantalla completa que se muestra mientras se valida la sesión guardada (POST /auth/autorizar).
 * Si la validación falla por un problema de conexión, muestra el mensaje y permite reintentar.
 */
@Component({
  selector: 'app-pantalla-carga',
  imports: [MosaicoFondo],
  template: `
    <app-mosaico-fondo [suave]="true" />
    @if (error(); as mensaje) {
      <main class="pantalla">
        <section class="panel">
          <img class="marca" src="favicon.svg" alt="" width="56" height="56" />
          <h1>No pudimos iniciar Mosaico</h1>
          <p class="texto" role="alert">{{ mensaje }}</p>
          <button class="btn primary" type="button" (click)="reintentar.emit()">Reintentar</button>
        </section>
      </main>
    } @else {
      <main class="pantalla" role="status" aria-live="polite" aria-busy="true">
        <section class="panel">
          <div class="spinner" aria-hidden="true">
            <span class="anillo"></span>
            <span class="anillo interno"></span>
            <img class="logo" src="favicon.svg" alt="" width="40" height="40" />
          </div>
          <h1 class="nombre">Mosaico</h1>
          <p class="texto">Validando tu sesión…</p>
        </section>
      </main>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .pantalla {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px 16px;
    }
    .panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: min(360px, 100%);
      padding: 40px 32px 36px;
      border-radius: 32px;
      background: rgb(255 255 255 / 0.92);
      box-shadow: var(--shadow);
      text-align: center;
      animation: entrada 0.45s ease-out both;
    }
    .spinner {
      position: relative;
      display: grid;
      place-items: center;
      width: 96px;
      height: 96px;
      margin-bottom: 8px;
    }
    .anillo {
      position: absolute;
      inset: 0;
      border: 6px solid rgb(230 0 35 / 0.14);
      border-top-color: var(--red);
      border-right-color: var(--red);
      border-radius: 50%;
      animation: girar 1.1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
    }
    .anillo.interno {
      inset: 14px;
      border-width: 5px;
      border-color: rgb(255 140 66 / 0.18);
      border-bottom-color: #ff8c42;
      border-left-color: #ff8c42;
      animation-duration: 1.6s;
      animation-direction: reverse;
    }
    .logo {
      width: 40px;
      height: 40px;
      animation: latido 1.6s ease-in-out infinite;
    }
    .marca {
      margin-bottom: 4px;
    }
    h1 {
      font-size: 22px;
    }
    .nombre {
      color: var(--red);
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .texto {
      color: var(--muted);
    }
    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes latido {
      50% {
        transform: scale(0.82);
        opacity: 0.8;
      }
    }
    @keyframes entrada {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
  `,
})
export class PantallaCarga {
  /** Mensaje de error de conexión; si hay uno se muestra en lugar del spinner. */
  readonly error = input<string | null>(null);
  readonly reintentar = output<void>();
}
