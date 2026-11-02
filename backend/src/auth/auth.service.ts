import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { guardarImagen } from '../common/imagen.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async registro(dto: RegistroDto, imagen?: Express.Multer.File) {
    if (dto.password !== dto.repetirPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existe = await this.users.existeCorreoOUsuario(
      dto.correo,
      dto.nombreUsuario,
    );
    if (existe.correo)
      throw new ConflictException('El correo ya está registrado');
    if (existe.nombreUsuario)
      throw new ConflictException('El nombre de usuario ya está en uso');

    const imagenPerfil = imagen
      ? await guardarImagen(imagen, 'perfiles')
      : null;
    const user = await this.users.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      nombreUsuario: dto.nombreUsuario,
      password: await bcrypt.hash(dto.password, 10),
      fechaNacimiento: new Date(dto.fechaNacimiento),
      descripcion: dto.descripcion,
      imagenPerfil,
      perfil: 'usuario',
    });

    return this.respuesta(this.users.toPublic(user));
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByCorreoOrUsername(dto.usuario);
    // Mismo mensaje para usuario inexistente y contraseña incorrecta (no revela qué usuarios existen).
    const passwordOk = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (!user.habilitado) {
      throw new UnauthorizedException(
        'Tu cuenta está deshabilitada. Contactá a un administrador',
      );
    }
    return this.respuesta(this.users.toPublic(user));
  }

  autorizar(usuario: UsuarioAutenticado) {
    return usuario;
  }

  refrescar(usuario: UsuarioAutenticado) {
    return this.respuesta(usuario);
  }

  private async respuesta(usuario: UsuarioAutenticado) {
    const datosToken = {
      sub: usuario.id,
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
      tipo: 'acceso',
    };
    const token = await this.jwt.signAsync(datosToken);
    return { usuario, token };
  }
}
