import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, defer, finalize, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion, Usuario } from '../models/usuario.model';
import { ModalService } from './modal.service';

const STORAGE_KEY = 'mosaico.sesion';
const AVISO_KEY = 'mosaico.aviso';
const CINCO_MINUTOS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sesion = signal<Sesion | null>(this.leerSesion());
  private temporizador?: ReturnType<typeof setTimeout>;
  private renovando = false;
  private avisoAbierto = false;
  private tokenAvisado: string | null = this.leerAlmacenamiento(AVISO_KEY);
  private readonly alVolver = () => this.comprobarVencimiento();

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.token ?? null);
  // Solo se habilita después de una respuesta válida del backend.
  readonly autenticado = signal(false);

  login(usuario: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/login`, { usuario, password })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  registro(datos: FormData): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/registro`, datos)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  autorizar(): Observable<Usuario> {
    const token = this.token();
    return this.http.post<Usuario>(`${environment.apiUrl}/auth/autorizar`, null).pipe(
      tap((usuario) => {
        if (token && token === this.token()) this.guardarSesion({ usuario, token });
      }),
    );
  }

  refrescar(): Observable<Sesion> {
    return defer(() => {
      if (this.renovando || !this.tokenVigente() || !this.autenticado()) {
        return throwError(() => new Error('La sesión no puede renovarse'));
      }
      const token = this.token();
      this.renovando = true;
      return this.http.post<Sesion>(`${environment.apiUrl}/auth/refrescar`, null).pipe(
        tap((sesion) => {
          if (this.token() === token && this.autenticado()) this.guardarSesion(sesion);
        }),
        finalize(() => {
          this.renovando = false;
        }),
      );
    });
  }

  logout(): void {
    this.detenerControl();
    this.sesion.set(null);
    this.autenticado.set(false);
    this.tokenAvisado = null;
    this.guardarAlmacenamiento(STORAGE_KEY, null);
    this.guardarAlmacenamiento(AVISO_KEY, null);
  }

  ngOnDestroy(): void {
    this.detenerControl();
  }

  private detenerControl(): void {
    clearTimeout(this.temporizador);
    window.removeEventListener('focus', this.alVolver);
    document.removeEventListener('visibilitychange', this.alVolver);
    if (this.avisoAbierto) this.modal.cerrar();
  }

  cerrarSesion(): void {
    this.logout();
    void this.router.navigate(['/login']);
  }

  tokenVigente(): boolean {
    return this.vencimiento() > Date.now();
  }

  /** Un solo temporizador: primero el aviso, después el vencimiento real del JWT. */
  comprobarVencimiento(): void {
    clearTimeout(this.temporizador);
    if (!this.autenticado()) return;
    const restante = this.vencimiento() - Date.now();
    if (restante <= 0) {
      this.cerrarSesion();
      return;
    }
    const avisado = this.tokenAvisado === this.token();
    if (!avisado && restante <= CINCO_MINUTOS) {
      void this.ofrecerExtension();
      return;
    }
    this.temporizador = setTimeout(this.alVolver, avisado ? restante : restante - CINCO_MINUTOS);
  }

  private async ofrecerExtension(): Promise<void> {
    const token = this.token();
    this.tokenAvisado = token;
    this.guardarAlmacenamiento(AVISO_KEY, token);
    this.comprobarVencimiento(); // Programa el cierre aunque el modal quede abierto.
    this.avisoAbierto = true;
    const aceptado = await this.modal.confirmar(
      'Tu sesión está por vencer',
      'Tu sesión vence en aproximadamente 5 minutos. ¿Querés extenderla por otros 15 minutos?',
      'Extender sesión',
      'Ahora no',
    );
    this.avisoAbierto = false;
    if (!aceptado || token !== this.token()) return;
    if (!this.tokenVigente()) {
      this.cerrarSesion();
      return;
    }
    this.refrescar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          if (token !== this.token()) return;
          if (error instanceof HttpErrorResponse && error.status === 401) this.cerrarSesion();
          else void this.modal.error('No pudimos extender tu sesión', mensajeDeError(error));
        },
      });
  }

  private guardarSesion(sesion: Sesion): void {
    this.sesion.set({ usuario: sesion.usuario, token: sesion.token });
    this.autenticado.set(true);
    this.guardarAlmacenamiento(STORAGE_KEY, JSON.stringify(this.sesion()));
    window.addEventListener('focus', this.alVolver);
    document.addEventListener('visibilitychange', this.alVolver);
    this.comprobarVencimiento();
  }

  private vencimiento(): number {
    try {
      const parte = this.token()?.split('.')[1];
      if (!parte) return 0;
      const payload = JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/'))) as {
        exp?: number;
      };
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
        ? payload.exp * 1000
        : 0;
    } catch {
      return 0;
    }
  }

  urlImagen(ruta: string | null | undefined): string | null {
    if (!ruta) return null;
    return /^https?:\/\//i.test(ruta) ? ruta : `${environment.apiUrl}${ruta}`;
  }

  private leerSesion(): Sesion | null {
    try {
      const sesion = JSON.parse(this.leerAlmacenamiento(STORAGE_KEY) ?? 'null') as Sesion | null;
      return sesion && typeof sesion.token === 'string' && sesion.usuario?.id
        ? { usuario: sesion.usuario, token: sesion.token }
        : null;
    } catch {
      return null;
    }
  }

  private leerAlmacenamiento(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private guardarAlmacenamiento(clave: string, valor: string | null): void {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    } catch {
      /* La sesión sigue funcionando en memoria. */
    }
  }
}

export function mensajeDeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0)
      return 'No se pudo conectar con el servidor. Intentá nuevamente en unos minutos.';
    const mensaje = err.error?.message;
    if (Array.isArray(mensaje)) return mensaje.join('\n');
    if (typeof mensaje === 'string') return mensaje;
  }
  return 'Ocurrió un error inesperado. Intentá nuevamente.';
}
