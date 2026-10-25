import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Un ObjectId de MongoDB son exactamente 24 caracteres hexadecimales.
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Rechaza con 400 los parámetros de ruta que no son un ObjectId válido (en vez de dejar que Mongoose falle con un 500). */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!OBJECT_ID.test(value)) {
      throw new BadRequestException('El identificador no es válido');
    }
    return value;
  }
}
