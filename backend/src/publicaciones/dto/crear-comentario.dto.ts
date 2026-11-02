import { TextoObligatorio } from '../../common/texto-obligatorio.decorator.js';

export class CrearComentarioDto {
  @TextoObligatorio('El comentario', 500)
  mensaje: string;
}
