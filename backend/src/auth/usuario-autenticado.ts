import type { Request } from 'express';
import type { Perfil } from '../users/schemas/user.schema.js';

/** Usuario ya verificado por el JwtAuthGuard. El perfil sale de la base de datos, no del token. */
export interface UsuarioAutenticado {
  id: string;
  nombreUsuario: string;
  imagenPerfil: string | null;
  perfil: Perfil;
}

export type SolicitudAutenticada = Request & { usuario: UsuarioAutenticado };
