import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import type { SolicitudAutenticada } from './usuario-autenticado.js';

/** Autorización reutilizable: el rol se consulta nuevamente en MongoDB. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SolicitudAutenticada>();
    if (!request.usuario) throw new UnauthorizedException('Tenés que iniciar sesión para continuar');
    const usuario = await this.users.findById(request.usuario.id);
    if (!usuario) throw new UnauthorizedException('La cuenta no existe');
    if (usuario.perfil !== 'administrador') throw new ForbiddenException('Se requiere perfil de administrador');
    return true;
  }
}
