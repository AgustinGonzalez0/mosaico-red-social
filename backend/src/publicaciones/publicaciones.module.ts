import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { UsersModule } from '../users/users.module.js';
import { ComentariosController } from './comentarios.controller.js';
import { ComentariosService } from './comentarios.service.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';
import { Comentario, ComentarioSchema } from './schemas/comentario.schema.js';
import { Publicacion, PublicacionSchema } from './schemas/publicacion.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
      { name: User.name, schema: UserSchema }, // para resolver el autor de cada publicación
    ]),
    AuthModule, // JwtService para el JwtAuthGuard
    UsersModule, // UsersService para el JwtAuthGuard
  ],
  controllers: [PublicacionesController, ComentariosController],
  providers: [PublicacionesService, ComentariosService],
})
export class PublicacionesModule {}
