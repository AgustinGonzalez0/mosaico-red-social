import { Component, ElementRef, effect, inject, untracked, viewChild } from '@angular/core';
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
  private readonly cancelar = viewChild<ElementRef<HTMLButtonElement>>('cancelar');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    // Al abrir, el foco pasa al modal: al botón de cancelar si hay una acción destructiva (más seguro),
    // o al botón principal para que Enter / Espacio lo cierren.
    effect(() => (this.cancelar() ?? this.boton())?.nativeElement.focus());

    // Al cerrar, el foco vuelve al elemento que lo tenía antes de abrir el modal.
    effect(() => {
      if (this.modal.actual()) {
        untracked(() => (this.elementoPrevio ??= document.activeElement as HTMLElement | null));
      } else {
        untracked(() => {
          this.elementoPrevio?.focus();
          this.elementoPrevio = null;
        });
      }
    });
  }

  /** Mantiene el foco dentro del modal mientras está abierto (Tab / Shift+Tab ciclan entre sus botones). */
  protected atraparFoco(event: Event, haciaAtras: boolean): void {
    const botones = [this.cancelar(), this.boton()].filter((b) => !!b).map((b) => b.nativeElement);
    if (botones.length === 0) return;
    const [primero, ultimo] = [botones[0], botones[botones.length - 1]];
    const activo = document.activeElement;
    if (haciaAtras && activo === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!haciaAtras && activo === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }
}
