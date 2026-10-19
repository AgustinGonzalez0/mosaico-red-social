import { Component, computed, inject, input, signal } from '@angular/core';
import { Publicacion } from '../../core/models/publicacion.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  protected readonly auth = inject(AuthService);

  readonly publicacion = input.required<Publicacion>();

  // Estado local de la demo: el "me gusta" real se conecta al backend en el Sprint 2.
  protected readonly leGusta = signal(false);
  protected readonly cantidad = computed(() => this.publicacion().meGusta + (this.leGusta() ? 1 : 0));

  protected readonly inicial = computed(() => this.publicacion().autor.nombreUsuario.charAt(0).toUpperCase());

  protected alternarMeGusta(): void {
    this.leGusta.update((v) => !v);
  }
}
