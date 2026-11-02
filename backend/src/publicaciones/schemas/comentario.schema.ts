import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { MENSAJE_MAX } from '../publicaciones.constants.js';

export type ComentarioDocument = HydratedDocument<Comentario>;

/** El autor y la fecha de creación se conservan al editar. */
@Schema({ timestamps: true })
export class Comentario {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Publicacion',
    required: true,
  })
  publicacion: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  autor: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: MENSAJE_MAX })
  mensaje: string;

  @Prop({ type: Boolean, default: false })
  modificado: boolean;

  createdAt: Date;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

// Comentarios de una publicación, los más recientes primero.
ComentarioSchema.index({ publicacion: 1, createdAt: -1 });
