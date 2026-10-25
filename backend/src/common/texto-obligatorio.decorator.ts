import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { registerDecorator, ValidationArguments } from 'class-validator';

/**
 * Texto obligatorio: se recorta (trim) y debe quedar con contenido y no superar `max` caracteres.
 * Un valor de solo espacios cuenta como vacío. Devuelve un único mensaje claro por campo.
 */
export function TextoObligatorio(etiqueta: string, max: number) {
  return applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (target: object, propiedad: string | symbol) =>
      registerDecorator({
        name: 'textoObligatorio',
        target: target.constructor,
        propertyName: propiedad as string,
        validator: {
          validate: (valor: unknown) =>
            typeof valor === 'string' && valor.length > 0 && valor.length <= max,
          defaultMessage: ({ value }: ValidationArguments) =>
            typeof value === 'string' && value.length > max
              ? `${etiqueta} no puede superar los ${max} caracteres`
              : `${etiqueta} es obligatorio`,
        },
      }),
  );
}
