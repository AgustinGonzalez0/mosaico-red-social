import { TextoObligatorio } from '../../common/texto-obligatorio.decorator.js';
import { MENSAJE_MAX } from '../publicaciones.constants.js';

export class CrearComentarioDto {
  @TextoObligatorio('El comentario', MENSAJE_MAX)
  mensaje: string;
}
