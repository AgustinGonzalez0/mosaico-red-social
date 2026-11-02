import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Comentario, Paginado, Publicacion } from '../../core/models/publicacion.model';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { PostCard } from '../../shared/post-card/post-card';

/** Cantidad de publicaciones recientes que muestra el perfil. */
const ULTIMAS = 3;

@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, RouterLink, PostCard],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss',
})
export class MiPerfil implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);

  protected readonly usuario = this.auth.usuario;
  protected readonly foto = computed(() => this.auth.urlImagen(this.usuario()?.imagenPerfil));
  protected readonly iniciales = computed(() => {
    const u = this.usuario();
    return u ? (u.nombre.charAt(0) + u.apellido.charAt(0)).toUpperCase() : '?';
  });

  protected readonly publicaciones = signal<Publicacion[]>([]);
  /** Total de publicaciones activas del usuario (no solo las 3 que se muestran). */
  protected readonly total = signal<number | null>(null);
  /** Comentarios de cada publicación mostrada, por id. Si falta una clave, no se pudieron cargar. */
  protected readonly comentarios = signal<Record<string, Paginado<Comentario>>>({});
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly esqueletos = [0, 1, 2];

  /** Cada pedido nuevo cancela el anterior que siga en curso (switchMap). */
  private readonly pedir$ = new Subject<void>();

  ngOnInit(): void {
    this.pedir$
      .pipe(
        switchMap(() => {
          const usuario = this.usuario();
          if (!usuario) return EMPTY;
          // Las 3 últimas publicaciones se piden ya filtradas y limitadas al backend; luego, sus comentarios.
          return this.servicio.obtenerPublicacionesDeUsuario(usuario.id, ULTIMAS).pipe(
            switchMap((respuesta) => {
              const pedidos = respuesta.data.map((p) =>
                this.servicio.listarComentarios(p.id).pipe(
                  map((lista) => [p.id, lista] as const),
                  catchError(() => of(null)), // si falla uno, el resto del perfil se sigue mostrando
                ),
              );
              return (pedidos.length ? forkJoin(pedidos) : of([])).pipe(map((pares) => ({ respuesta, pares })));
            }),
            catchError((err) => {
              this.error.set(mensajeDeError(err));
              this.cargando.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ respuesta, pares }) => {
        this.publicaciones.set(respuesta.data);
        this.total.set(respuesta.total);
        this.comentarios.set(
          Object.fromEntries(pares.filter((par) => par !== null)) as Record<string, Paginado<Comentario>>,
        );
        this.error.set(null);
        this.cargando.set(false);
      });

    if (this.usuario()) this.pedir$.next();
    else this.cargando.set(false);
  }

  protected alEliminar(id: string): void {
    this.publicaciones.update((lista) => lista.filter((p) => p.id !== id));
    this.pedir$.next(); // trae de nuevo las últimas 3 (ahora entra la siguiente) y corrige el total
  }

  protected reintentar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pedir$.next();
  }
}
