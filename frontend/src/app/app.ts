import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, InjectionToken, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { catchError, finalize, map, of, switchMap, timer } from 'rxjs';
import { Modal } from './shared/modal/modal';
import { PantallaCarga } from './shared/pantalla-carga/pantalla-carga';
import { AuthService, mensajeDeError } from './core/services/auth.service';

/** Tiempo mínimo (ms) que se ve la pantalla de carga al validar una sesión guardada. */
export const DURACION_MINIMA_CARGA = new InjectionToken<number>('DURACION_MINIMA_CARGA', {
  providedIn: 'root',
  factory: () => 2500,
});

type Validacion =
  | { tipo: 'valida' }
  | { tipo: 'rechazada' } // el backend respondió 401: el JWT no sirve
  | { tipo: 'fallo'; error: unknown }; // sin conexión, 500...: no significa que el JWT sea inválido

@Component({
  imports: [RouterOutlet, Modal, PantallaCarga],
  selector: 'app-root',
  template: `
    @if (cargando() || error()) {
      <app-pantalla-carga [error]="error()" (reintentar)="validarSesion()" />
    } @else {
      <div class="contenido-app"><router-outlet /></div>
    }
    <app-modal />
  `,
  styles: `
    .contenido-app {
      animation: aparecer 0.4s ease-out;
    }
    @keyframes aparecer {
      from {
        opacity: 0;
      }
    }
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ubicacion = inject(Location);
  private readonly duracionMinima = inject(DURACION_MINIMA_CARGA);
  private destinoInicial = '/';
  private validando = false;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.destinoInicial = this.ubicacion.path(true) || '/';
    this.validarSesion();
  }

  /**
   * La validación real (POST /auth/autorizar) empieza de inmediato. La pantalla se oculta recién
   * cuando ocurrieron las dos cosas: el backend respondió Y pasó la duración mínima.
   */
  protected validarSesion(): void {
    if (this.validando) return; // nunca dos validaciones simultáneas
    this.error.set(null);
    this.cargando.set(true);
    if (!this.auth.token()) {
      // Sin token no hay nada que validar: no se consulta al backend ni se muestra demora.
      this.auth.logout();
      this.abrirRutaInicial();
      return;
    }
    this.validando = true;
    const inicio = Date.now();
    this.auth
      .autorizar()
      .pipe(
        map((): Validacion => ({ tipo: 'valida' })),
        catchError((error: unknown) =>
          of<Validacion>(
            error instanceof HttpErrorResponse && error.status === 401
              ? { tipo: 'rechazada' }
              : { tipo: 'fallo', error },
          ),
        ),
        // Un fallo de conexión se informa enseguida; los demás resultados esperan lo que falte.
        switchMap((resultado) => {
          const falta = this.duracionMinima - (Date.now() - inicio);
          return resultado.tipo === 'fallo' || falta <= 0
            ? of(resultado)
            : timer(falta).pipe(map(() => resultado));
        }),
        finalize(() => (this.validando = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (resultado.tipo === 'fallo') {
          this.cargando.set(false);
          this.error.set(mensajeDeError(resultado.error));
          return;
        }
        if (resultado.tipo === 'rechazada') this.auth.logout();
        this.abrirRutaInicial();
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
