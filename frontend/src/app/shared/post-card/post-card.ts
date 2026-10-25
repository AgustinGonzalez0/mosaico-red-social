import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { EstadoMeGusta, Publicacion } from '../../core/models/publicacion.model';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';

@Component({
  selector: 'app-post-card',
  imports: [DatePipe],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  protected readonly auth = inject(AuthService);
  private readonly publicaciones = inject(PublicacionesService);
  private readonly modal = inject(ModalService);

  /** Publicación que muestra la tarjeta (la entrega el componente padre). */
  readonly publicacion = input.required<Publicacion>();

  /** Avisa al padre, con el id, que la publicación se eliminó para que la saque de su lista. */
  readonly eliminada = output<string>();

  /**
   * Cantidad de "me gusta" y si el usuario ya dio el suyo. Arranca con lo que trae la publicación y,
   * cuando el backend confirma una acción, se actualiza con su respuesta. Si el padre entrega una
   * publicación nueva (por ejemplo, al recargar la lista), vuelve a tomar sus valores.
   */
  protected readonly estado = linkedSignal<EstadoMeGusta>(() => ({
    meGusta: this.publicacion().meGusta,
    leGusta: this.publicacion().leGusta,
  }));

  /** Hay una operación en curso: evita clics repetidos sobre la misma tarjeta. */
  protected readonly ocupada = signal(false);

  protected readonly inicial = computed(() => this.publicacion().autor.nombreUsuario.charAt(0).toUpperCase());

  /** Solo el autor o un administrador ven el botón (el backend vuelve a verificar el permiso). */
  protected readonly puedeEliminar = computed(() => {
    const usuario = this.auth.usuario();
    return !!usuario && (usuario.id === this.publicacion().autor.id || usuario.perfil === 'administrador');
  });

  protected alternarMeGusta(): void {
    if (this.ocupada()) return;
    this.ocupada.set(true);

    const { id } = this.publicacion();
    const peticion = this.estado().leGusta ? this.publicaciones.quitarMeGusta(id) : this.publicaciones.darMeGusta(id);
    peticion.subscribe({
      next: (estado) => {
        this.estado.set(estado); // se muestra lo que confirmó el backend
        this.ocupada.set(false);
      },
      error: (err) => {
        this.ocupada.set(false); // el estado anterior se conserva
        this.modal.error('No pudimos actualizar tu me gusta', mensajeDeError(err));
      },
    });
  }

  protected async eliminar(): Promise<void> {
    if (this.ocupada()) return;
    const { id, titulo } = this.publicacion();
    const confirmado = await this.modal.confirmar(
      '¿Eliminar publicación?',
      `"${titulo}" dejará de estar disponible para todos. Esta acción no se puede deshacer.`,
      'Eliminar',
    );
    if (!confirmado) return;

    this.ocupada.set(true);
    this.publicaciones.eliminarPublicacion(id).subscribe({
      next: () => {
        this.ocupada.set(false);
        this.eliminada.emit(id);
      },
      error: (err) => {
        this.ocupada.set(false);
        this.modal.error('No pudimos eliminar la publicación', mensajeDeError(err));
      },
    });
  }
}
