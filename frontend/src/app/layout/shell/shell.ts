import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SoloAdminDirective } from '../../shared/directives/solo-admin.directive';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SoloAdminDirective],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly inicial = computed(() => this.auth.usuario()?.nombre.charAt(0).toUpperCase() ?? '?');

  protected salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
