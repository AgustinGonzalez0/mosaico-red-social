import { Component, DestroyRef, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorDeImagen } from '../../core/imagen';
import { MENSAJE_MAX, Publicacion, TITULO_MAX } from '../../core/models/publicacion.model';
import { mensajeDeError } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { textoNoVacio } from '../../core/validators';

/** Formulario para crear una publicación, en una ventana flotante. El padre decide cuándo mostrarla. */
@Component({
  selector: 'app-crear-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './crear-publicacion.html',
  styleUrl: './crear-publicacion.scss',
})
export class CrearPublicacion {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly publicaciones = inject(PublicacionesService);
  private readonly modal = inject(ModalService);
  private readonly titulo = viewChild.required<ElementRef<HTMLInputElement>>('titulo');

  /** El usuario cerró la ventana (después de confirmar si había cambios sin publicar). */
  readonly cerrar = output<void>();
  /** El backend creó la publicación. */
  readonly creada = output<Publicacion>();

  protected readonly TITULO_MAX = TITULO_MAX;
  protected readonly MENSAJE_MAX = MENSAJE_MAX;
  protected readonly cargando = signal(false);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);
  private imagen: File | null = null;

  protected readonly form = this.fb.group({
    titulo: ['', [Validators.required, textoNoVacio, Validators.maxLength(TITULO_MAX)]],
    mensaje: ['', [Validators.required, textoNoVacio, Validators.maxLength(MENSAJE_MAX)]],
  });

  constructor() {
    afterNextRender(() => this.titulo().nativeElement.focus());
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  protected get f() {
    return this.form.controls;
  }

  protected elegirImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return; // el usuario canceló el selector: se conserva la imagen anterior

    const motivo = errorDeImagen(archivo);
    input.value = '';
    this.errorImagen.set(motivo);
    if (motivo) return;

    this.liberarVistaPrevia();
    this.imagen = archivo;
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  protected quitarImagen(): void {
    this.liberarVistaPrevia();
    this.imagen = null;
    this.errorImagen.set(null);
  }

  protected enviar(): void {
    if (this.cargando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, mensaje } = this.form.getRawValue();
    const datos = new FormData();
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    if (this.imagen) datos.append('imagen', this.imagen);

    this.cargando.set(true);
    this.publicaciones.crearPublicacion(datos).subscribe({
      next: (publicacion) => {
        this.cargando.set(false);
        this.creada.emit(publicacion);
        this.modal.exito('¡Publicación creada!', 'Tu publicación ya está disponible para la comunidad.');
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.error('No pudimos crear tu publicación', mensajeDeError(err));
      },
    });
  }

  protected async cancelar(): Promise<void> {
    if (this.cargando()) return;
    const haySinPublicar = this.form.dirty || this.imagen !== null;
    if (haySinPublicar) {
      const descartar = await this.modal.confirmar(
        '¿Descartar la publicación?',
        'Si salís ahora se pierde lo que escribiste.',
        'Descartar',
        'Seguir editando',
      );
      if (!descartar) return;
    }
    this.cerrar.emit();
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
