import { Component } from '@angular/core';
import { Publicacion } from '../../core/models/publicacion.model';
import { PostCard } from '../../shared/post-card/post-card';

@Component({
  selector: 'app-publicaciones',
  imports: [PostCard],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones {
  // Sprint 1: todavía no hay endpoint de publicaciones. El listado real (orden, paginación) llega en el Sprint 2.
  protected readonly publicaciones: Publicacion[] = [];
}
