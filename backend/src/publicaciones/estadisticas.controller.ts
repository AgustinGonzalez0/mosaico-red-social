import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { EstadisticasDto } from './dto/estadisticas.dto.js';
import { EstadisticasService } from './estadisticas.service.js';

@Controller('estadisticas')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EstadisticasController {
  constructor(private readonly estadisticas: EstadisticasService) {}
  @Get('publicaciones-por-usuario') publicacionesPorUsuario(@Query() dto: EstadisticasDto) { return this.estadisticas.publicacionesPorUsuario(dto); }
  @Get('comentarios-por-fecha') comentariosPorFecha(@Query() dto: EstadisticasDto) { return this.estadisticas.comentariosPorFecha(dto); }
  @Get('comentarios-por-publicacion') comentariosPorPublicacion(@Query() dto: EstadisticasDto) { return this.estadisticas.comentariosPorPublicacion(dto); }
}
