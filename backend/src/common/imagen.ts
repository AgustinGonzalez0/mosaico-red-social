
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

export interface ImagenSubida {
  url: string;
  ancho: number;
  alto: number;
}

// El MIME lo declara el cliente, así que no alcanza: comprobamos también la firma (primeros bytes) del archivo.
function tieneFirmaDeImagen(buffer: Buffer | undefined): boolean {
  if (!buffer) return false;
  const empiezaCon = (...bytes: number[]) => bytes.every((byte, i) => buffer[i] === byte);
  const texto = (desde: number, hasta: number) => buffer.toString('latin1', desde, hasta);

  return (
    empiezaCon(0xff, 0xd8, 0xff) || // JPEG
    empiezaCon(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) || // PNG
    texto(0, 4) === 'GIF8' || // GIF87a / GIF89a
    (texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') // WEBP
  );
}

// Sube una imagen a Cloudinary y devuelve su URL.
export async function guardarImagen(
  file: Express.Multer.File,
  carpeta: string,
): Promise<string> {
  return (await subirImagen(file, carpeta)).url;
}

// Igual que guardarImagen, pero además devuelve las dimensiones (para reservar el espacio en la grilla).
export async function subirImagen(
  file: Express.Multer.File,
  carpeta: string,
): Promise<ImagenSubida> {
  if (!tieneFirmaDeImagen(file.buffer)) {
    throw new BadRequestException('El archivo no es una imagen válida');
  }

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

  return new Promise<ImagenSubida>((resolve, reject) => {
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

        resolve({
          url: result.secure_url,
          ancho: result.width,
          alto: result.height,
        });
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
