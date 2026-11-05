import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { imageFileFilter, MAX_IMAGE_BYTES } from '../common/imagen.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { PaginacionQueryDto } from '../common/paginacion.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { UsersService } from './users.service.js';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() listar(@Query() query: PaginacionQueryDto) { return this.users.listar(query.offset, query.limit); }
  @Post()
  @UseInterceptors(FileInterceptor('imagenPerfil', { limits: { fileSize: MAX_IMAGE_BYTES }, fileFilter: imageFileFilter }))
  crear(@Body() dto: CrearUsuarioDto, @UploadedFile() imagen: Express.Multer.File | undefined) { return this.users.crearAdministrado(dto, imagen); }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deshabilitar(@Param('id', ParseObjectIdPipe) id: string, @UsuarioActual() usuario: UsuarioAutenticado) { return this.users.deshabilitar(id, usuario.id); }
  @Post(':id/habilitar')
  @HttpCode(HttpStatus.OK)
  habilitar(@Param('id', ParseObjectIdPipe) id: string) { return this.users.habilitar(id); }
}
