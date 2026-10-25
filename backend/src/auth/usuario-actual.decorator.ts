import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SolicitudAutenticada, UsuarioAutenticado } from './usuario-autenticado.js';

/** Inyecta en el handler el usuario que validó el JwtAuthGuard: `@UsuarioActual() usuario`. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado =>
    context.switchToHttp().getRequest<SolicitudAutenticada>().usuario,
);
