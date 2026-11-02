import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Comentario,
  EstadoMeGusta,
  OrdenPublicaciones,
  Paginado,
  Publicacion,
} from '../models/publicacion.model';

export interface FiltroPublicaciones {
  orden?: OrdenPublicaciones;
  offset?: number;
  limit?: number;
  /** Id del usuario autor: solo trae sus publicaciones. */
  autor?: string;
}

/** Todas las llamadas HTTP de publicaciones. El token lo agrega authInterceptor. */
@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/publicaciones`;

  listarPublicaciones(filtro: FiltroPublicaciones = {}): Observable<Paginado<Publicacion>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== undefined) params = params.set(clave, String(valor));
    }
    return this.http.get<Paginado<Publicacion>>(this.url, { params });
  }

  /** Las últimas publicaciones de un usuario (para Mi Perfil: 3). Se filtra y limita en el servidor. */
  obtenerPublicacionesDeUsuario(autorId: string, limit = 3): Observable<Paginado<Publicacion>> {
    return this.listarPublicaciones({ autor: autorId, orden: 'fecha', offset: 0, limit });
  }

  /** `datos` es un FormData (titulo, mensaje e imagen opcional). El navegador arma el Content-Type multipart. */
  crearPublicacion(datos: FormData): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.url, datos);
  }

  eliminarPublicacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  darMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http.post<EstadoMeGusta>(`${this.url}/${id}/me-gusta`, null);
  }

  quitarMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http.delete<EstadoMeGusta>(`${this.url}/${id}/me-gusta`);
  }

  /** Solo lectura en el Sprint 2 (los comentarios se escriben recién en el Sprint 3). */
  listarComentarios(publicacionId: string, limit = 5): Observable<Paginado<Comentario>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<Paginado<Comentario>>(`${this.url}/${publicacionId}/comentarios`, { params });
  }

  obtenerPublicacion(id: string): Observable<Publicacion> {
    return this.http.get<Publicacion>(`${this.url}/${id}`);
  }

  crearComentario(publicacionId: string, mensaje: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.url}/${publicacionId}/comentarios`, { mensaje });
  }

  editarComentario(publicacionId: string, comentarioId: string, mensaje: string): Observable<Comentario> {
    return this.http.put<Comentario>(`${this.url}/${publicacionId}/comentarios/${comentarioId}`, { mensaje });
  }
}
