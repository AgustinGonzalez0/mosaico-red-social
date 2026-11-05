import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'estadoUsuario', standalone: true })
export class EstadoUsuarioPipe implements PipeTransform { transform(habilitado: boolean | null | undefined): string { return habilitado ? 'Habilitado' : 'Deshabilitado'; } }
