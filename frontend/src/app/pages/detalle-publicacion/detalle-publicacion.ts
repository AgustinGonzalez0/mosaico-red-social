import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Comentario, Publicacion } from '../../core/models/publicacion.model';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';

@Component({
  selector: 'app-detalle-publicacion',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './detalle-publicacion.html',
  styleUrl: './detalle-publicacion.scss',
})
export class DetallePublicacion implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicio = inject(PublicacionesService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthService);
  protected readonly publicacion = signal<Publicacion | null>(null);
  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<string | null>(null);
  protected readonly formulario = this.fb.group({
    mensaje: ['', [Validators.required, Validators.maxLength(500)]],
  });
  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.mostrarError('No se encontró la publicación');
      return;
    }
    this.servicio.obtenerPublicacion(id).subscribe({
      next: (p) => {
        this.publicacion.set(p);
        this.cargarComentarios(id);
      },
      error: (e) => this.mostrarError(mensajeDeError(e)),
    });
  }
  private cargarComentarios(id: string): void {
    this.servicio.listarComentarios(id, 50).subscribe({
      next: (r) => {
        this.comentarios.set(r.data);
        this.cargando.set(false);
      },
      error: (e) => this.mostrarError(mensajeDeError(e)),
    });
  }
  protected guardarComentario(): void {
    const p = this.publicacion();
    if (this.formulario.invalid || this.guardando() || !p) return;
    const id = this.editando();
    const mensaje = this.formulario.controls.mensaje.value;
    const pedido = id
      ? this.servicio.editarComentario(p.id, id, mensaje)
      : this.servicio.crearComentario(p.id, mensaje);
    this.guardando.set(true);
    pedido.subscribe({
      next: (c) => {
        this.comentarios.update((lista) =>
          id ? lista.map((actual) => (actual.id === c.id ? c : actual)) : [c, ...lista],
        );
        this.cancelarEdicion();
        this.guardando.set(false);
      },
      error: (e) => {
        this.mostrarError(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }
  protected editarComentario(c: Comentario): void {
    this.editando.set(c.id);
    this.formulario.setValue({ mensaje: c.mensaje });
  }
  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset();
  }
  protected esAutor(c: Comentario): boolean {
    return c.autor.id === this.auth.usuario()?.id;
  }
  private mostrarError(mensaje: string): void {
    this.error.set(mensaje);
    this.cargando.set(false);
  }
}
