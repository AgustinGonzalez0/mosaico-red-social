import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { Modal } from './shared/modal/modal';
import { AuthService, mensajeDeError } from './core/services/auth.service';

@Component({
  imports: [RouterOutlet, Modal],
  selector: 'app-root',
  template: `
    @if (cargando()) {
      <main class="inicio" aria-busy="true" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <h1>Mosaico</h1>
        <p>Validando tu sesión…</p>
      </main>
    } @else if (error(); as mensaje) {
      <main class="inicio">
        <h1>No pudimos iniciar Mosaico</h1>
        <p role="alert">{{ mensaje }}</p>
        <button class="btn primary" type="button" (click)="validarSesion()">Reintentar</button>
      </main>
    } @else {
      <router-outlet />
    }
    <app-modal />
  `,
  styles: `
    .inicio {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 20px;
      padding: 24px;
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 5px solid var(--surface);
      border-top-color: var(--red);
      border-radius: 50%;
      animation: girar 0.8s linear infinite;
    }
    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ubicacion = inject(Location);
  private destinoInicial = '/';
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.destinoInicial = this.ubicacion.path(true) || '/';
    this.validarSesion();
  }

  protected validarSesion(): void {
    this.error.set(null);
    this.cargando.set(true);
    if (!this.auth.token()) {
      this.auth.logout();
      this.abrirRutaInicial();
      return;
    }
    this.auth
      .autorizar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.abrirRutaInicial();
        },
        error: (error) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.auth.logout();
            this.abrirRutaInicial();
          } else {
            this.cargando.set(false);
            this.error.set(mensajeDeError(error));
          }
        },
      });
  }

  /** La primera navegación se realiza después de resolver la sesión; el guard protege el destino. */
  private abrirRutaInicial(): void {
    const ruta = this.destinoInicial.split(/[?#]/)[0] || '/';
    const destino =
      this.auth.autenticado() && ['/', '/login', '/registro'].includes(ruta)
        ? '/publicaciones'
        : this.destinoInicial;
    this.cargando.set(false);
    void this.router.navigateByUrl(destino, { replaceUrl: true });
  }
}
