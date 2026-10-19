import { Injectable, signal } from '@angular/core';

export type TipoModal = 'exito' | 'error' | 'info';

export interface ModalConfig {
  tipo: TipoModal;
  titulo: string;
  mensaje: string;
  textoBoton?: string;
}

/** Reemplaza a alert(): muestra un modal y resuelve la promesa cuando el usuario lo cierra. */
@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly actual = signal<ModalConfig | null>(null);
  private resolver: (() => void) | null = null;

  abrir(config: ModalConfig): Promise<void> {
    this.cerrar();
    this.actual.set(config);
    return new Promise<void>((resolve) => (this.resolver = resolve));
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

  cerrar(): void {
    this.actual.set(null);
    this.resolver?.();
    this.resolver = null;
  }
}
