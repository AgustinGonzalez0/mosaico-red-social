import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type Perfil = 'usuario' | 'administrador';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, trim: true })
  nombre: string;

  @Prop({ type: String, required: true, trim: true })
  apellido: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  nombreUsuario: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: Date, required: true })
  fechaNacimiento: Date;

  @Prop({ type: String, required: true, trim: true })
  descripcion: string;

  @Prop({ type: String, default: null })
  imagenPerfil: string | null;

  @Prop({ type: String, enum: ['usuario', 'administrador'], default: 'usuario' })
  perfil: Perfil;

  @Prop({ type: Boolean, default: true })
  habilitado: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
