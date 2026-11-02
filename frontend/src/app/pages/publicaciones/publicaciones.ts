import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subscription, catchError } from 'rxjs';
import { OrdenPublicaciones, Publicacion } from '../../core/models/publicacion.model';
import { mensajeDeError } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { CrearPublicacion } from '../../shared/crear-publicacion/crear-publicacion';
import { PostCard } from '../../shared/post-card/post-card';

/** Cantidad de publicaciones por página (parámetro `limit` de la API). */
const POR_PAGINA = 3;

const ORDENES: { valor: OrdenPublicaciones; texto: string }[] = [
  { valor: 'fecha', texto: 'Más recientes' },
  { valor: 'meGusta', texto: 'Más populares' },
];

@Component({
  selector: 'app-publicaciones',
  imports: [PostCard, CrearPublicacion, RouterLink],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones implements OnInit {
  private readonly servicio = inject(PublicacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;
  private numeroSolicitud = 0;

  protected readonly ordenes = ORDENES;
  protected readonly orden = signal<OrdenPublicaciones>('fecha');
  protected readonly publicaciones = signal<Publicacion[]>([]);
  protected readonly hasMore = signal(true);
  protected readonly cargando = signal(true);
  protected readonly error = signal<{ mensaje: string; sesion: boolean } | null>(null);
  protected readonly creando = signal(false);

  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);

  ngOnInit(): void {
    this.cargarPublicaciones(this.orden(), false);
  }

  protected cargarPublicaciones(orden: OrdenPublicaciones, agregar: boolean): void {
    const numeroSolicitud = ++this.numeroSolicitud;
    const offset = agregar ? this.publicaciones().length : 0;

    this.solicitud?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);

    this.solicitud = this.servicio
      .listarPublicaciones({ orden, offset, limit: POR_PAGINA })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          if (numeroSolicitud === this.numeroSolicitud) {
            this.cargando.set(false);
            this.error.set({
              mensaje: mensajeDeError(err),
              sesion: err instanceof HttpErrorResponse && err.status === 401,
            });
          }
          return EMPTY;
        }),
      )
      .subscribe((respuesta) => {
        if (numeroSolicitud !== this.numeroSolicitud) return;

        this.hasMore.set(respuesta.hasMore);
        this.publicaciones.update((lista) => agregar ? [...lista, ...respuesta.data] : respuesta.data);
        this.cargando.set(false);
      });
  }

  protected cambiarOrden(orden: OrdenPublicaciones): void {
    if (orden === this.orden()) return;
    this.orden.set(orden);
    this.cargarPublicaciones(orden, false);
  }

  protected reintentar(): void {
    this.cargarPublicaciones(this.orden(), false);
  }

  protected cargarMas(): void {
    if (!this.cargando() && this.hasMore()) this.cargarPublicaciones(this.orden(), true);
  }

  protected alCrear(): void {
    this.creando.set(false);
    this.orden.set('fecha');
    this.cargarPublicaciones('fecha', false);
  }

  protected alEliminar(id: string): void {
    this.publicaciones.update((lista) => lista.filter((p) => p.id !== id));
    this.cargarPublicaciones(this.orden(), false);
  }
}
