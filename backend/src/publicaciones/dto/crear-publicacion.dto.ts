import { TextoObligatorio } from '../../common/texto-obligatorio.decorator.js';
import { MENSAJE_MAX, TITULO_MAX } from '../publicaciones.constants.js';

/** Campos de texto del POST /publicaciones (multipart). La imagen llega aparte, como archivo `imagen`. */
export class CrearPublicacionDto {
  @TextoObligatorio('El título', TITULO_MAX)
  titulo: string;

  @TextoObligatorio('El mensaje', MENSAJE_MAX)
  mensaje: string;
}
