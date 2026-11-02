import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Comentario, MENSAJE_MAX, Publicacion } from '../../core/models/publicacion.model';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { textoNoVacio } from '../../core/validators';

const POR_BLOQUE = 5;

@Component({
  selector: 'app-detalle-publicacion',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './detalle-publicacion.html',
  styleUrl: './detalle-publicacion.scss',
})
export class DetallePublicacion implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicio = inject(PublicacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthService);

  protected readonly publicacion = signal<Publicacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly cargandoComentarios = signal(false);
  protected readonly hasMoreComentarios = signal(true);
  protected readonly offsetComentarios = signal(0);
  protected readonly totalComentarios = signal(0);
  protected readonly errorComentarios = signal<string | null>(null);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<string | null>(null);
  protected readonly limiteMensaje = MENSAJE_MAX;
  protected readonly formulario = this.fb.group({
    mensaje: ['', [Validators.required, textoNoVacio, Validators.maxLength(MENSAJE_MAX)]],
  });

  ngOnInit(): void {
    this.obtenerPublicacion();
  }

  protected obtenerPublicacion(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    this.cargando.set(true);
    this.error.set(null);
    if (!id) {
      this.error.set('No se encontró la publicación');
      this.cargando.set(false);
      return;
    }
    this.servicio
      .obtenerPublicacion(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publicacion) => {
          this.publicacion.set(publicacion);
          this.cargando.set(false);
          this.cargarComentarios();
        },
        error: (error) => {
          this.error.set(mensajeDeError(error));
          this.cargando.set(false);
        },
      });
  }

  protected cargarComentarios(): void {
    const publicacion = this.publicacion();
    if (!publicacion || this.cargandoComentarios() || this.guardando()) return;
    this.cargandoComentarios.set(true);
    this.errorComentarios.set(null);
    this.servicio
      .listarComentarios(publicacion.id, POR_BLOQUE, this.offsetComentarios())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const ids = new Set(this.comentarios().map((comentario) => comentario.id));
          const nuevos = respuesta.data.filter((comentario) => {
            if (ids.has(comentario.id)) return false;
            ids.add(comentario.id);
            return true;
          });
          this.comentarios.update((lista) => [...lista, ...nuevos]);
          this.offsetComentarios.set(respuesta.offset + respuesta.data.length);
          this.totalComentarios.set(respuesta.total);
          this.hasMoreComentarios.set(respuesta.hasMore);
          this.cargandoComentarios.set(false);
        },
        error: (error) => {
          this.errorComentarios.set(mensajeDeError(error));
          this.cargandoComentarios.set(false);
        },
      });
  }

  protected cargarMasComentarios(): void {
    if (this.hasMoreComentarios()) this.cargarComentarios();
  }

  protected guardarComentario(): void {
    this.formulario.markAllAsTouched();
    const publicacion = this.publicacion();
    if (this.formulario.invalid || this.guardando() || this.cargandoComentarios() || !publicacion)
      return;
    const comentarioId = this.editando();
    const mensaje = this.formulario.controls.mensaje.value.trim();
    const pedido = comentarioId
      ? this.servicio.editarComentario(publicacion.id, comentarioId, mensaje)
      : this.servicio.crearComentario(publicacion.id, mensaje);
    this.guardando.set(true);
    this.errorFormulario.set(null);
    pedido.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (comentario) => {
        if (comentarioId) {
          this.comentarios.update((lista) =>
            lista.map((actual) => (actual.id === comentario.id ? comentario : actual)),
          );
        } else {
          this.comentarios.update((lista) => [comentario, ...lista]);
          // La inserción desplaza una posición los siguientes bloques del servidor.
          this.offsetComentarios.update((offset) => offset + 1);
          this.totalComentarios.update((total) => total + 1);
        }
        this.guardando.set(false);
        this.cancelarEdicion();
      },
      error: (error) => {
        this.errorFormulario.set(mensajeDeError(error));
        this.guardando.set(false);
      },
    });
  }

  protected editarComentario(comentario: Comentario): void {
    if (!this.esAutor(comentario) || this.guardando()) return;
    this.editando.set(comentario.id);
    this.errorFormulario.set(null);
    this.formulario.setValue({ mensaje: comentario.mensaje });
  }

  protected cancelarEdicion(): void {
    if (this.guardando()) return;
    this.editando.set(null);
    this.errorFormulario.set(null);
    this.formulario.reset();
  }

  protected esAutor(comentario: Comentario): boolean {
    return comentario.autor.id === this.auth.usuario()?.id;
  }
}
