// Contrato con el backend (GET/POST /publicaciones). Los nombres coinciden con la respuesta de la API.

// Mismos límites que el backend (backend/src/publicaciones/publicaciones.constants.ts).
export const TITULO_MAX = 100;
export const MENSAJE_MAX = 500;

export interface AutorPublicacion {
  id: string;
  nombreUsuario: string;
  imagenPerfil: string | null;
}

export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagen: string | null;
  /** Dimensiones de la imagen: reservan el espacio y evitan saltos de layout en la grilla. */
  ancho: number | null;
  alto: number | null;
  autor: AutorPublicacion;
  /** Cantidad total de "me gusta". */
  meGusta: number;
  /** Si el usuario autenticado ya le dio "me gusta". */
  leGusta: boolean;
  createdAt: string;
}

/** Respuesta de POST/DELETE /publicaciones/:id/me-gusta. */
export interface EstadoMeGusta {
  meGusta: number;
  leGusta: boolean;
}

export interface Comentario {
  id: string;
  mensaje: string;
  modificado: boolean;
  autor: AutorPublicacion;
  createdAt: string;
}

export type OrdenPublicaciones = 'fecha' | 'meGusta';

/** Respuesta paginada por offset/limit. */
export interface Paginado<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
