import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ComentarioDocument = HydratedDocument<Comentario>;

/**
 * Esquema mínimo de comentarios. En el Sprint 2 solo se lee (Mi Perfil); el alta y la edición
 * (POST / PUT, con `modificado: true`) se agregan en el Sprint 3 sobre este mismo modelo.
 */
@Schema({ timestamps: true })
export class Comentario {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Publicacion', required: true })
  publicacion: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  autor: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  mensaje: string;

  @Prop({ type: Boolean, default: false })
  modificado: boolean;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

// Comentarios de una publicación, los más recientes primero.
ComentarioSchema.index({ publicacion: 1, createdAt: -1 });
