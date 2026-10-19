import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
