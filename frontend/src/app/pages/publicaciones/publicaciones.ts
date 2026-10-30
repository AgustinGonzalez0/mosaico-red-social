import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
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
export class Publicaciones {
  private readonly servicio = inject(PublicacionesService);

  protected readonly ordenes = ORDENES;
  protected readonly orden = signal<OrdenPublicaciones>('fecha');
  protected readonly pagina = signal(1);

  protected readonly publicaciones = signal<Publicacion[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<{ mensaje: string; sesion: boolean } | null>(null);
  protected readonly creando = signal(false);

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / POR_PAGINA)));
  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);

  /** Cada pedido nuevo cancela el anterior que siga en curso (switchMap): nunca se pisan los resultados. */
  private readonly pedir$ = new Subject<void>();

  constructor() {
    this.pedir$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.servicio
            .listarPublicaciones({
              orden: this.orden(),
              offset: (this.pagina() - 1) * POR_PAGINA,
              limit: POR_PAGINA,
            })
            .pipe(
              catchError((err) => {
                this.cargando.set(false);
                this.error.set({
                  mensaje: mensajeDeError(err),
                  sesion: err instanceof HttpErrorResponse && err.status === 401,
                });
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((respuesta) => {
        this.total.set(respuesta.total);
        // La página quedó vacía (p. ej. se eliminaron publicaciones): se vuelve a la última que exista.
        if (respuesta.data.length === 0 && respuesta.total > 0 && this.pagina() > 1) {
          this.pagina.set(this.totalPaginas());
          this.pedir$.next();
          return;
        }
        this.publicaciones.set(respuesta.data);
        this.cargando.set(false);
      });

    this.pedir$.next();
  }

  protected cambiarOrden(orden: OrdenPublicaciones): void {
    if (orden === this.orden()) return;
    this.orden.set(orden);
    this.pagina.set(1);
    this.pedir$.next(); // se consulta de nuevo al backend: MongoDB ordena antes de paginar
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this.pagina()) return;
    this.pagina.set(pagina);
    this.pedir$.next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected reintentar(): void {
    this.pedir$.next();
  }

  protected alCrear(): void {
    // La nueva publicación es la más reciente: se vuelve a la primera página ordenada por fecha.
    this.creando.set(false);
    this.orden.set('fecha');
    this.pagina.set(1);
    this.pedir$.next();
  }

  protected alEliminar(id: string): void {
    this.publicaciones.update((lista) => lista.filter((p) => p.id !== id));
    this.pedir$.next(); // vuelve a pedir la página para rellenarla y corregir el total
  }
}
