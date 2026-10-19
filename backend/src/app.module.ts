import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module.js';
import { UPLOADS_DIR } from './common/imagen.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGO_URI') }),
    }),
    ServeStaticModule.forRoot({ rootPath: UPLOADS_DIR, serveRoot: '/uploads' }),
    AuthModule,
    UsersModule,
    PublicacionesModule,
  ],
})
export class AppModule {}
