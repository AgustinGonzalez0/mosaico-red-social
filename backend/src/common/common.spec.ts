import { BadRequestException } from '@nestjs/common';
import { subirImagen } from './imagen.js';
import { paginado } from './paginacion.js';
import { ParseObjectIdPipe } from './parse-object-id.pipe.js';

const archivo = (contenido: Buffer) =>
  ({ buffer: contenido, mimetype: 'image/png' }) as Express.Multer.File;

describe('subirImagen (verificación de contenido)', () => {
  it.each([
    ['texto plano', Buffer.from('no soy una imagen')],
    ['un PDF', Buffer.from('%PDF-1.4 ...')],
    ['un archivo vacío', Buffer.alloc(0)],
    ['RIFF que no es WEBP', Buffer.from('RIFF....WAVEfmt ')],
  ])('rechaza con 400 %s aunque el MIME diga image/png', async (_nombre, contenido) => {
    await expect(subirImagen(archivo(contenido), 'publicaciones')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza con 400 si no hay buffer', async () => {
    await expect(
      subirImagen({ mimetype: 'image/png' } as Express.Multer.File, 'publicaciones'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('deja pasar un ObjectId válido', () => {
    expect(pipe.transform('64b7f0f0f0f0f0f0f0f0f0f0')).toBe('64b7f0f0f0f0f0f0f0f0f0f0');
  });

  it.each(['', 'abc', '64b7f0f0f0f0f0f0f0f0f0f', '64b7f0f0f0f0f0f0f0f0f0fg', '123456789012'])(
    'rechaza con 400 "%s"',
    (valor) => {
      expect(() => pipe.transform(valor)).toThrow(BadRequestException);
    },
  );
});

describe('paginado', () => {
  it('calcula hasMore según lo ya entregado y el total', () => {
    expect(paginado([1, 2, 3], 7, 0, 3).hasMore).toBe(true);
    expect(paginado([7], 7, 6, 3).hasMore).toBe(false);
    expect(paginado([], 0, 0, 12)).toEqual({ data: [], total: 0, offset: 0, limit: 12, hasMore: false });
  });
});
