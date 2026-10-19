import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, RouterLink],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss',
})
export class MiPerfil {
  protected readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.usuario;
  protected readonly foto = computed(() => this.auth.urlImagen(this.usuario()?.imagenPerfil));
  protected readonly iniciales = computed(() => {
    const u = this.usuario();
    return u ? (u.nombre.charAt(0) + u.apellido.charAt(0)).toUpperCase() : '?';
  });
}
