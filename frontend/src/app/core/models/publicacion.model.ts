export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagen: string | null;
  /** Dimensiones de la imagen: reservan el espacio y evitan saltos de layout en la grilla. */
  ancho?: number;
  alto?: number;
  autor: { nombreUsuario: string; imagenPerfil: string | null };
  meGusta: number;
}
