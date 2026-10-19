import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  host: { '(document:keydown.escape)': 'modal.cerrar()' },
})
export class Modal {
  protected readonly modal = inject(ModalService);
  private readonly boton = viewChild<ElementRef<HTMLButtonElement>>('boton');

  constructor() {
    // Al abrir, el foco pasa al botón para que Enter / Espacio cierren el modal.
    effect(() => this.boton()?.nativeElement.focus());
  }
}
