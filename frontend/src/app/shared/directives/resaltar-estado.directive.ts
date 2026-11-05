import { Directive, HostBinding, Input } from '@angular/core';
@Directive({ selector: '[appResaltarEstado]', standalone: true })
export class ResaltarEstadoDirective {
  @Input() set appResaltarEstado(valor: boolean | string) { this.habilitado = valor === true || valor === ''; }
  @HostBinding('class.estado-habilitado') habilitado = false;
  @HostBinding('class.estado-deshabilitado') get deshabilitado() { return !this.habilitado; }
}
