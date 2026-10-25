import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { MENSAJE_MAX, TITULO_MAX } from '../publicaciones.constants.js';

export type PublicacionDocument = HydratedDocument<Publicacion>;

@Schema({ timestamps: true })
export class Publicacion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  autor: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: TITULO_MAX })
  titulo: string;

  @Prop({ type: String, required: true, trim: true, maxlength: MENSAJE_MAX })
  mensaje: string;

  @Prop({ type: String, default: null })
  imagen: string | null;

  /** Dimensiones de la imagen (las informa Cloudinary): el frontend reserva el espacio y la grilla no salta. */
  @Prop({ type: Number, default: null })
  ancho: number | null;

  @Prop({ type: Number, default: null })
  alto: number | null;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  meGusta: Types.ObjectId[];

  @Prop({ type: Boolean, default: true })
  activa: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);

// Índices para el listado paginado: el muro (activas, más recientes primero) y el filtro por autor.
PublicacionSchema.index({ activa: 1, createdAt: -1 });
PublicacionSchema.index({ autor: 1, activa: 1, createdAt: -1 });
