import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublicacionDocument = HydratedDocument<Publicacion>;

@Schema({ timestamps: true })
export class Publicacion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  autor: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  titulo: string;

  @Prop({ type: String, required: true, trim: true })
  mensaje: string;

  @Prop({ type: String, default: null })
  imagen: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  meGusta: Types.ObjectId[];

  @Prop({ type: Boolean, default: true })
  activa: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
