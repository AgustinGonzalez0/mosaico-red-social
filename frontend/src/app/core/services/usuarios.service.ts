import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';

export interface UsuariosPage { data: Usuario[]; total: number; offset: number; limit: number; hasMore: boolean; }
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;
  listar(offset = 0, limit = 10): Observable<UsuariosPage> { return this.http.get<UsuariosPage>(this.url, { params: new HttpParams().set('offset', offset).set('limit', limit) }); }
  crear(datos: FormData): Observable<Usuario> { return this.http.post<Usuario>(this.url, datos); }
  deshabilitar(id: string): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  habilitar(id: string): Observable<void> { return this.http.post<void>(`${this.url}/${id}/habilitar`, null); }
}
