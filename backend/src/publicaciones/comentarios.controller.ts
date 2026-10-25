import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { PaginacionQueryDto } from '../common/paginacion.js';
import { ComentariosService } from './comentarios.service.js';

@Controller('publicaciones/:id/comentarios')
@UseGuards(JwtAuthGuard)
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  @Get()
  listar(@Param('id', ParseObjectIdPipe) id: string, @Query() query: PaginacionQueryDto) {
    return this.comentarios.listar(id, query);
  }
}
