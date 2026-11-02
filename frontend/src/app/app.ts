import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Modal } from './shared/modal/modal';
import { AuthService } from './core/services/auth.service';

@Component({
  imports: [RouterOutlet, Modal],
  selector: 'app-root',
  template: `
    @if (cargando()) { <main aria-busy="true">Cargando sesión…</main> }
    @else { <router-outlet /> <app-modal /> }
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    if (this.auth.token() && !this.auth.tokenVigente()) {
      try {
        this.auth.refrescar().subscribe({ next: () => this.cargando.set(false), error: () => { this.auth.logout(); this.cargando.set(false); } });
      } catch { this.auth.logout(); this.cargando.set(false); }
      return;
    }
    this.cargando.set(false);
  }
}
