import { Component } from '@angular/core';
import { PUBLICACIONES_DEMO } from '../../core/mock/publicaciones.mock';
import { PostCard } from '../../shared/post-card/post-card';

@Component({
  selector: 'app-publicaciones',
  imports: [PostCard],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones {
  // Sprint 1: datos de demostración. El listado real (orden, paginación) llega en el Sprint 2.
  protected readonly publicaciones = PUBLICACIONES_DEMO;
}
