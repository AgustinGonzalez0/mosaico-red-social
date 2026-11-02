import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion } from '../models/usuario.model';

const STORAGE_KEY = 'mosaico.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = signal<Sesion | null>(this.leerSesion());
  private refrescando$: Observable<Sesion> | null = null;

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.token ?? null);
  readonly autenticado = computed(() => this.sesion() !== null);

  login(usuario: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/login`, { usuario, password })
      .pipe(tap((s) => this.guardarSesion(s)));
  }

  registro(datos: FormData): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/registro`, datos)
      .pipe(tap((s) => this.guardarSesion(s)));
  }

  logout(): void {
    const refreshToken = this.sesion()?.refreshToken;
    this.sesion.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    if (refreshToken) this.http.post<void>(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe();
  }

  tokenVigente(): boolean {
    const token = this.token();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return !!payload.exp && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  refrescar(): Observable<Sesion> {
    if (!this.sesion()?.refreshToken) {
      throw new Error('No hay refresh token');
    }
    if (!this.refrescando$) {
      this.refrescando$ = this.http
        .post<Sesion>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.sesion()?.refreshToken })
        .pipe(
          tap((sesion) => this.guardarSesion(sesion)),
          finalize(() => (this.refrescando$ = null)),
          shareReplay(1),
        );
    }
    return this.refrescando$;
  }

  /** URL absoluta de una imagen servida por el backend (o null si no hay). */
  urlImagen(ruta: string | null | undefined): string | null {
    if (!ruta) return null;

    if (/^https?:\/\//i.test(ruta)) {
      return ruta;
    }

    return `${environment.apiUrl}${ruta}`;
  }

  private guardarSesion(s: Sesion): void {
    this.sesion.set(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }

  private leerSesion(): Sesion | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Sesion) : null;
    } catch {
      return null;
    }
  }
}

/** Convierte un error HTTP en un mensaje legible para mostrar al usuario. */
export function mensajeDeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Intentá nuevamente en unos minutos.';
    const msg = err.error?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    if (typeof msg === 'string') return msg;
  }
  return 'Ocurrió un error inesperado. Intentá nuevamente.';
}
