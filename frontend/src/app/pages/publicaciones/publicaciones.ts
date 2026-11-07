import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subscription, catchError } from 'rxjs';
import { OrdenPublicaciones, Publicacion } from '../../core/models/publicacion.model';
import { mensajeDeError } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { CrearPublicacion } from '../../shared/crear-publicacion/crear-publicacion';
import { MosaicoFondo } from '../../shared/mosaico-fondo/mosaico-fondo';
import { PostCard } from '../../shared/post-card/post-card';

/** Cantidad de publicaciones por página (parámetro `limit` de la API). */
const POR_PAGINA = 3;

const ORDENES: { valor: OrdenPublicaciones; texto: string }[] = [
  { valor: 'fecha', texto: 'Más recientes' },
  { valor: 'meGusta', texto: 'Más populares' },
];

@Component({
  selector: 'app-publicaciones',
  imports: [PostCard, CrearPublicacion, MosaicoFondo, RouterLink],
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
  protected readonly pagina = signal(1);

  protected readonly publicaciones = signal<Publicacion[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<{ mensaje: string; sesion: boolean } | null>(null);
  protected readonly creando = signal(false);

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / POR_PAGINA)),
  );
  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);

  ngOnInit(): void {
    this.cargarPublicaciones(this.orden(), this.pagina());
  }

  protected cargarPublicaciones(orden: OrdenPublicaciones, pagina: number): void {
    const numeroSolicitud = ++this.numeroSolicitud;
    const offset = (pagina - 1) * POR_PAGINA;

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

        this.total.set(respuesta.total);
        const ultimaPagina = Math.max(1, Math.ceil(respuesta.total / POR_PAGINA));
        if (respuesta.data.length === 0 && respuesta.total > 0 && pagina > ultimaPagina) {
          this.pagina.set(ultimaPagina);
          this.cargarPublicaciones(orden, ultimaPagina);
          return;
        }
        this.publicaciones.set(respuesta.data);
        this.cargando.set(false);
      });
  }

  protected cambiarOrden(orden: OrdenPublicaciones): void {
    if (orden === this.orden()) return;
    this.orden.set(orden);
    this.pagina.set(1);
    this.cargarPublicaciones(orden, 1);
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this.pagina()) return;
    this.pagina.set(pagina);
    this.cargarPublicaciones(this.orden(), pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected reintentar(): void {
    this.cargarPublicaciones(this.orden(), this.pagina());
  }

  protected alCrear(): void {
    this.creando.set(false);
    this.orden.set('fecha');
    this.pagina.set(1);
    this.cargarPublicaciones('fecha', 1);
  }

  protected alEliminar(id: string): void {
    this.publicaciones.update((lista) => lista.filter((p) => p.id !== id));
    this.cargarPublicaciones(this.orden(), this.pagina());
  }
}
