import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const imageFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(new BadRequestException('La imagen debe ser JPG, PNG, WEBP o GIF'), false);
  }
  cb(null, true);
};

/** Guarda el archivo en uploads/<carpeta> y devuelve la URL pública relativa. */
export async function guardarImagen(file: Express.Multer.File, carpeta: string): Promise<string> {
  const dir = join(UPLOADS_DIR, carpeta);
  await mkdir(dir, { recursive: true });
  const nombre = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
  await writeFile(join(dir, nombre), file.buffer);
  return `/uploads/${carpeta}/${nombre}`;
}
