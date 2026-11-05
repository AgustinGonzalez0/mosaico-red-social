import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicacionesUsuario { usuarioId: string; nombreUsuario: string; cantidad: number; }
export interface ComentariosDia { fecha: string; cantidad: number; }
export interface ComentariosPublicacion { publicacionId: string; titulo: string; cantidad: number; }
export interface Estadisticas { publicaciones: PublicacionesUsuario[]; fechas: ComentariosDia[]; publicacionesComentarios: ComentariosPublicacion[]; }
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/estadisticas`;
  consultar(desde: string, hasta: string): Observable<Estadisticas> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return forkJoin({
      publicaciones: this.http.get<PublicacionesUsuario[]>(`${this.url}/publicaciones-por-usuario`, { params }),
      fechas: this.http.get<ComentariosDia[]>(`${this.url}/comentarios-por-fecha`, { params }),
      publicacionesComentarios: this.http.get<ComentariosPublicacion[]>(`${this.url}/comentarios-por-publicacion`, { params }),
    });
  }
}
