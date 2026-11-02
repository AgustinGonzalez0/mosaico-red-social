import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { SolicitudAutenticada } from './usuario-autenticado.js';
import type { UsersService } from '../users/users.service.js';

const SECRETO = 'secreto-de-prueba';

function contexto(authorization?: string) {
  const request = { headers: { authorization } } as SolicitudAutenticada;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { request, context };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({
    secret: SECRETO,
    signOptions: { expiresIn: '15m' },
  });
  const usuario = {
    _id: { toString: () => '64b7f0f0f0f0f0f0f0f0f0f0' },
    nombreUsuario: 'ana',
    imagenPerfil: null,
    perfil: 'usuario',
    habilitado: true,
  };
  const findById = vi.fn();
  const guard = new JwtAuthGuard(jwt, {
    findById,
    toPublic: (user: typeof usuario) => ({
      id: user._id.toString(),
      nombreUsuario: user.nombreUsuario,
      imagenPerfil: user.imagenPerfil,
      perfil: user.perfil,
    }),
  } as unknown as UsersService);

  beforeEach(() => findById.mockReset().mockResolvedValue(usuario));

  it('deja pasar un token válido y deja al usuario en la solicitud', async () => {
    const token = await jwt.signAsync(
      { sub: usuario._id.toString(), tipo: 'acceso' },
      { expiresIn: '15m' },
    );
    const { request, context } = contexto(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith(usuario._id.toString());
    expect(request.usuario).toEqual({
      id: '64b7f0f0f0f0f0f0f0f0f0f0',
      nombreUsuario: 'ana',
      imagenPerfil: null,
      perfil: 'usuario',
    });
  });

  it('toma el perfil de la base de datos, no del token', async () => {
    const token = await jwt.signAsync({
      sub: usuario._id.toString(),
      tipo: 'acceso',
      perfil: 'administrador',
    });
    findById.mockResolvedValue({ ...usuario, perfil: 'usuario' });
    const { request, context } = contexto(`Bearer ${token}`);

    await guard.canActivate(context);
    expect(request.usuario.perfil).toBe('usuario');
  });

  it.each([
    ['no hay encabezado', undefined],
    ['no es Bearer', 'Basic abc'],
    ['falta el token', 'Bearer'],
    ['el token es basura', 'Bearer basura'],
  ])('responde 401 si %s', async (_caso, cabecera) => {
    await expect(
      guard.canActivate(contexto(cabecera).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findById).not.toHaveBeenCalled();
  });

  it('responde 401 si el token está firmado con otra clave o venció', async () => {
    const ajeno = await new JwtService({ secret: 'otra' }).signAsync({
      sub: usuario._id.toString(),
      tipo: 'acceso',
    });
    const vencido = await jwt.signAsync(
      { sub: usuario._id.toString(), tipo: 'acceso' },
      { expiresIn: '-1s' },
    );
    for (const token of [ajeno, vencido]) {
      await expect(
        guard.canActivate(contexto(`Bearer ${token}`).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('responde 401 si el usuario ya no existe o está deshabilitado', async () => {
    const token = await jwt.signAsync({
      sub: usuario._id.toString(),
      tipo: 'acceso',
    });
    for (const resultado of [null, { ...usuario, habilitado: false }]) {
      findById.mockResolvedValue(resultado);
      await expect(
        guard.canActivate(contexto(`Bearer ${token}`).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it.each(['refresh', 'desconocido', undefined])(
    'rechaza el tipo de token %s',
    async (tipo) => {
      const token = await jwt.signAsync({ sub: usuario._id.toString(), tipo });
      await expect(
        guard.canActivate(contexto(`Bearer ${token}`).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(findById).not.toHaveBeenCalled();
    },
  );

  it('rechaza un sub inválido o un JWT sin vencimiento', async () => {
    const sinExp = await new JwtService({ secret: SECRETO }).signAsync({
      sub: usuario._id.toString(),
      tipo: 'acceso',
    });
    const malId = await jwt.signAsync({ sub: 'incorrecto', tipo: 'acceso' });
    for (const token of [sinExp, malId]) {
      await expect(
        guard.canActivate(contexto(`Bearer ${token}`).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
});
