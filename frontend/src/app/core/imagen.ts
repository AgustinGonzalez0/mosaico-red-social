// Mismas reglas que el backend (backend/src/common/imagen.ts): formatos permitidos y tamaño máximo.
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;

/** Devuelve el motivo por el que el archivo no sirve como imagen, o null si es válido. */
export function errorDeImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'El archivo debe ser una imagen JPG, PNG, WEBP o GIF.';
  if (archivo.size > MAX_BYTES_IMAGEN) return 'La imagen no puede superar los 5 MB.';
  return null;
}
