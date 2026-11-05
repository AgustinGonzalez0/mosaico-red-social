import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { guardarImagen } from '../common/imagen.js';
import { Paginado, paginado } from '../common/paginacion.js';
import type { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByCorreoOrUsername(identificador: string): Promise<UserDocument | null> {
    const valor = identificador.trim();
    return this.userModel
      .findOne({ $or: [{ correo: valor.toLowerCase() }, { nombreUsuario: valor }] })
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async existeCorreoOUsuario(correo: string, nombreUsuario: string) {
    const [porCorreo, porUsuario] = await Promise.all([
      this.userModel.exists({ correo: correo.toLowerCase().trim() }),
      this.userModel.exists({ nombreUsuario: nombreUsuario.trim() }),
    ]);
    return { correo: !!porCorreo, nombreUsuario: !!porUsuario };
  }

  async listar(offset: number, limit: number): Promise<Paginado<ReturnType<UsersService['toPublic']>>> {
    const [usuarios, total] = await Promise.all([
      this.userModel.find().sort({ apellido: 1, nombre: 1, _id: 1 }).skip(offset).limit(limit).exec(),
      this.userModel.countDocuments(),
    ]);
    return paginado(usuarios.map((usuario) => this.toPublic(usuario)), total, offset, limit);
  }

  async crearAdministrado(dto: CrearUsuarioDto, imagen?: Express.Multer.File) {
    if (dto.password !== dto.repetirPassword) throw new ConflictException('Las contraseñas no coinciden');
    const existe = await this.existeCorreoOUsuario(dto.correo, dto.nombreUsuario);
    if (existe.correo) throw new ConflictException('El correo ya está registrado');
    if (existe.nombreUsuario) throw new ConflictException('El nombre de usuario ya está en uso');
    const imagenPerfil = imagen ? await guardarImagen(imagen, 'perfiles') : null;
    const usuario = await this.create({
      nombre: dto.nombre, apellido: dto.apellido, correo: dto.correo,
      nombreUsuario: dto.nombreUsuario, password: await bcrypt.hash(dto.password, 10),
      fechaNacimiento: new Date(dto.fechaNacimiento), descripcion: dto.descripcion,
      imagenPerfil, perfil: dto.perfil, habilitado: true,
    });
    return this.toPublic(usuario);
  }

  async deshabilitar(id: string, actualId: string): Promise<void> {
    if (id === actualId) throw new ConflictException('No podés deshabilitar tu propia cuenta');
    const usuario = await this.findById(id);
    if (!usuario) throw new NotFoundException('El usuario no existe');
    if (!usuario.habilitado) throw new ConflictException('El usuario ya está deshabilitado');
    if (usuario.perfil === 'administrador') {
      const administradores = await this.userModel.countDocuments({ perfil: 'administrador', habilitado: true });
      if (administradores <= 1) throw new ConflictException('Debe quedar al menos un administrador habilitado');
    }
    await this.userModel.updateOne({ _id: id }, { $set: { habilitado: false } });
  }

  async habilitar(id: string): Promise<void> {
    const usuario = await this.findById(id);
    if (!usuario) throw new NotFoundException('El usuario no existe');
    if (usuario.habilitado) throw new ConflictException('El usuario ya está habilitado');
    await this.userModel.updateOne({ _id: id }, { $set: { habilitado: true } });
  }

  /** Datos públicos del usuario: nunca incluye el hash de la contraseña. */
  toPublic(user: UserDocument) {
    return {
      id: user._id.toString(),
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      nombreUsuario: user.nombreUsuario,
      fechaNacimiento: user.fechaNacimiento,
      descripcion: user.descripcion,
      imagenPerfil: user.imagenPerfil,
      perfil: user.perfil,
      habilitado: user.habilitado,
    };
  }
}
