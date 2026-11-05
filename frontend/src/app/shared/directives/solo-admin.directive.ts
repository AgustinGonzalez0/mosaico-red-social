import { Directive, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
@Directive({ selector: '[appSoloAdmin]', standalone: true })
export class SoloAdminDirective {
  private readonly auth = inject(AuthService); private readonly template = inject(TemplateRef<unknown>); private readonly view = inject(ViewContainerRef); private visible = false;
  constructor() { effect(() => { const esAdmin = this.auth.usuario()?.perfil === 'administrador'; if (esAdmin && !this.visible) { this.view.createEmbeddedView(this.template); this.visible = true; } else if (!esAdmin && this.visible) { this.view.clear(); this.visible = false; } }); }
}
