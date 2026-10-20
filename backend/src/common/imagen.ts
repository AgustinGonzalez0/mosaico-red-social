
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { join } from 'node:path';

// Mantenemos esta ruta para las fotos locales antiguas.
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Tamaño máximo: 5 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Formatos aceptados
const TIPOS_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const imageFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(
      new BadRequestException('Formato de imagen no permitido'),
      false,
    );
  }

  cb(null, true);
};

// Sube una imagen a Cloudinary y devuelve su URL.
export async function guardarImagen(
  file: Express.Multer.File,
  carpeta: string,
): Promise<string> {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new InternalServerErrorException(
      'Cloudinary no está configurado',
    );
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return new Promise<string>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `mosaico/${carpeta}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(
            new InternalServerErrorException(
              'No se pudo subir la imagen',
            ),
          );
          return;
        }

        resolve(result.secure_url);
      },
    );

    upload.on('error', () => {
      reject(
        new InternalServerErrorException(
          'Error al enviar la imagen',
        ),
      );
    });

    upload.end(file.buffer);
  });
}
