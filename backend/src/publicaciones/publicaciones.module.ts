import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publicacion, PublicacionSchema } from './schemas/publicacion.schema.js';

// Sprint 1: solo se define el modelo. Los controllers (alta, listado, me gusta, comentarios) llegan en los sprints 2 y 3.
@Module({
  imports: [MongooseModule.forFeature([{ name: Publicacion.name, schema: PublicacionSchema }])],
})
export class PublicacionesModule {}
