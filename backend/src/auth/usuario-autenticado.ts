import type { Request } from 'express';
import type { UsersService } from '../users/users.service.js';

/** Usuario ya verificado por el JwtAuthGuard. El perfil sale de la base de datos, no del token. */
export type UsuarioAutenticado = ReturnType<UsersService['toPublic']>;

export type SolicitudAutenticada = Request & { usuario: UsuarioAutenticado };
