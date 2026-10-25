import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { imageFileFilter, MAX_IMAGE_BYTES } from '../common/imagen.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

// Todas las rutas exigen un JWT válido (JwtAuthGuard): la identidad sale siempre del token.
@Controller('publicaciones')
@UseGuards(JwtAuthGuard)
export class PublicacionesController {
  constructor(private readonly publicaciones: PublicacionesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  crear(
    @Body() dto: CrearPublicacionDto,
    @UploadedFile() imagen: Express.Multer.File | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.publicaciones.crear(dto, imagen, usuario); // 201 Created
  }

  @Get()
  listar(@Query() query: ListarPublicacionesDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.publicaciones.listar(query, usuario.id); // 200 OK
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('id', ParseObjectIdPipe) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.publicaciones.eliminar(id, usuario); // 204 No Content
  }

  @Post(':id/me-gusta')
  darMeGusta(
    @Param('id', ParseObjectIdPipe) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.publicaciones.darMeGusta(id, usuario.id); // 201 Created
  }

  @Delete(':id/me-gusta')
  @HttpCode(HttpStatus.OK)
  quitarMeGusta(
    @Param('id', ParseObjectIdPipe) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.publicaciones.quitarMeGusta(id, usuario.id); // 200 OK con el nuevo estado
  }
}
