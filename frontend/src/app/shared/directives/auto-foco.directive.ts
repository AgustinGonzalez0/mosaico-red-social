import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
@Directive({ selector: '[appAutoFoco]', standalone: true })
export class AutoFocoDirective implements AfterViewInit {
  private readonly elemento = inject(ElementRef<HTMLInputElement>);
  ngAfterViewInit(): void { queueMicrotask(() => this.elemento.nativeElement.focus()); }
}
