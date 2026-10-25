import { Injectable, signal } from '@angular/core';

export type TipoModal = 'exito' | 'error' | 'info' | 'confirmar';

export interface ModalConfig {
  tipo: TipoModal;
  titulo: string;
  mensaje: string;
  textoBoton?: string;
  /** Si está definido, el modal muestra además un botón para cancelar. */
  textoCancelar?: string;
}

/** Reemplaza a alert() y confirm(): muestra un modal y resuelve la promesa cuando el usuario lo cierra. */
@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly actual = signal<ModalConfig | null>(null);
  private resolver: ((aceptado: boolean) => void) | null = null;

  /** Resuelve `true` si el usuario aceptó y `false` si cerró el modal (Cancelar, Escape o clic afuera). */
  abrir(config: ModalConfig): Promise<boolean> {
    this.cerrar();
    this.actual.set(config);
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  exito(titulo: string, mensaje: string) {
    return this.abrir({ tipo: 'exito', titulo, mensaje });
  }

  error(titulo: string, mensaje: string) {
    return this.abrir({ tipo: 'error', titulo, mensaje });
  }

  info(titulo: string, mensaje: string) {
    return this.abrir({ tipo: 'info', titulo, mensaje });
  }

  /** Pide confirmación antes de una acción destructiva. Resuelve `true` solo si el usuario confirma. */
  confirmar(titulo: string, mensaje: string, textoBoton = 'Confirmar', textoCancelar = 'Cancelar') {
    return this.abrir({ tipo: 'confirmar', titulo, mensaje, textoBoton, textoCancelar });
  }

  cerrar(aceptado = false): void {
    this.actual.set(null);
    this.resolver?.(aceptado);
    this.resolver = null;
  }
}
