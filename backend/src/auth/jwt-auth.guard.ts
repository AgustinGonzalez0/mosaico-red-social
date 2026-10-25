import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import type { SolicitudAutenticada } from './usuario-autenticado.js';

/**
 * Protege una ruta: exige `Authorization: Bearer <token>`, verifica la firma y el vencimiento del JWT
 * y comprueba que el usuario siga existiendo y habilitado. Si algo falla responde 401.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SolicitudAutenticada>();

    const token = this.extraerToken(request);
    if (!token) throw new UnauthorizedException('Tenés que iniciar sesión para continuar');

    let id: string;
    try {
      // verifyAsync comprueba la firma (JWT_SECRET) y que el token no haya vencido.
      id = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch {
      throw new UnauthorizedException('Tu sesión no es válida o expiró. Iniciá sesión nuevamente');
    }

    // El token solo prueba quién era el usuario al iniciar sesión: se consulta su estado actual.
    const user = await this.users.findById(id);
    if (!user || !user.habilitado) {
      throw new UnauthorizedException('Tu cuenta no está habilitada para usar la aplicación');
    }

    request.usuario = {
      id: user._id.toString(),
      nombreUsuario: user.nombreUsuario,
      imagenPerfil: user.imagenPerfil,
      perfil: user.perfil,
    };
    return true;
  }

  private extraerToken(request: SolicitudAutenticada): string | null {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : null;
  }
}
