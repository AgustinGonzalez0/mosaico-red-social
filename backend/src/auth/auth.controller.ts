import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter, MAX_IMAGE_BYTES } from '../common/imagen.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  @UseInterceptors(
    FileInterceptor('imagenPerfil', {
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  registro(@Body() dto: RegistroDto, @UploadedFile() imagen?: Express.Multer.File) {
    return this.auth.registro(dto, imagen); // 201 Created
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
