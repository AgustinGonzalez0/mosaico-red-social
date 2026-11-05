import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'resumenTexto', standalone: true })
export class ResumenTextoPipe implements PipeTransform {
  transform(texto: string | null | undefined, limite = 60): string {
    const valor = (texto ?? '').trim();
    if (valor.length <= limite) return valor;
    const corto = valor.slice(0, Math.max(0, limite - 3)).trimEnd();
    const ultimo = corto.lastIndexOf(' ');
    return `${(ultimo > 0 ? corto.slice(0, ultimo) : corto)}...`;
  }
}
