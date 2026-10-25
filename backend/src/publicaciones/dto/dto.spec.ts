import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearPublicacionDto } from './crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './listar-publicaciones.dto.js';

async function mensajesDe<T extends object>(clase: new () => T, datos: object) {
  const errores = await validate(plainToInstance(clase, datos));
  return errores.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('CrearPublicacionDto', () => {
  it('acepta título y mensaje válidos y los recorta', async () => {
    const dto = plainToInstance(CrearPublicacionDto, { titulo: '  Hola  ', mensaje: ' mundo ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ titulo: 'Hola', mensaje: 'mundo' });
  });

  it.each([
    [{ mensaje: 'm' }, ['El título es obligatorio']],
    [{ titulo: '', mensaje: 'm' }, ['El título es obligatorio']],
    [{ titulo: '    ', mensaje: 'm' }, ['El título es obligatorio']],
    [{ titulo: 5, mensaje: 'm' }, ['El título es obligatorio']],
    [{ titulo: 'a'.repeat(101), mensaje: 'm' }, ['El título no puede superar los 100 caracteres']],
    [{ titulo: 't' }, ['El mensaje es obligatorio']],
    [{ titulo: 't', mensaje: ' \n ' }, ['El mensaje es obligatorio']],
    [{ titulo: 't', mensaje: 'a'.repeat(501) }, ['El mensaje no puede superar los 500 caracteres']],
  ])('rechaza %j con un único mensaje', async (datos, esperado) => {
    expect(await mensajesDe(CrearPublicacionDto, datos)).toEqual(esperado);
  });

  it('acepta justo el largo máximo', async () => {
    expect(
      await mensajesDe(CrearPublicacionDto, { titulo: 'a'.repeat(100), mensaje: 'b'.repeat(500) }),
    ).toEqual([]);
  });
});

describe('ListarPublicacionesDto', () => {
  it('usa orden por fecha, offset 0 y limit 12 por defecto', () => {
    expect(plainToInstance(ListarPublicacionesDto, {})).toMatchObject({
      orden: 'fecha',
      offset: 0,
      limit: 12,
    });
  });

  it('convierte los números que llegan como texto en la query', async () => {
    const dto = plainToInstance(ListarPublicacionesDto, {
      orden: 'meGusta',
      offset: '24',
      limit: '12',
      autor: '64b7f0f0f0f0f0f0f0f0f0f0',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ orden: 'meGusta', offset: 24, limit: 12 });
  });

  it.each([
    [{ limit: '0' }],
    [{ limit: '51' }],
    [{ limit: '1.5' }],
    [{ limit: 'diez' }],
    [{ offset: '-1' }],
    [{ offset: 'x' }],
    [{ orden: 'popularidad' }],
    [{ autor: 'abc' }],
  ])('rechaza %j', async (datos) => {
    expect((await mensajesDe(ListarPublicacionesDto, datos)).length).toBeGreaterThan(0);
  });
});
