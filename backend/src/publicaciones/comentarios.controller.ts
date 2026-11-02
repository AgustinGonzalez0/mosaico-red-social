import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { PaginacionQueryDto } from '../common/paginacion.js';
import { ComentariosService } from './comentarios.service.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';

@Controller('publicaciones/:id/comentarios')
@UseGuards(JwtAuthGuard)
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  @Get()
  listar(@Param('id', ParseObjectIdPipe) id: string, @Query() query: PaginacionQueryDto) {
    return this.comentarios.listar(id, query);
  }

  @Post()
  crear(
    @Param('id', ParseObjectIdPipe) publicacionId: string,
    @Body() dto: CrearComentarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.comentarios.crear(publicacionId, dto, usuario.id);
  }

  @Put(':comentarioId')
  editar(
    @Param('id', ParseObjectIdPipe) publicacionId: string,
    @Param('comentarioId', ParseObjectIdPipe) comentarioId: string,
    @Body() dto: CrearComentarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.comentarios.editar(publicacionId, comentarioId, dto, usuario.id);
  }
}
