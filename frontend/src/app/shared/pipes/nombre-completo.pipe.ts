import { Pipe, PipeTransform } from '@angular/core';
import { Usuario } from '../../core/models/usuario.model';
@Pipe({ name: 'nombreCompleto', standalone: true })
export class NombreCompletoPipe implements PipeTransform {
  transform(usuario: Pick<Usuario, 'nombre' | 'apellido'> | null | undefined): string { return [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || 'Sin nombre'; }
}
