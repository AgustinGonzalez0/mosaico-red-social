import { IsDateString, IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../common/password.js';

export class RegistroDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(50)
  apellido: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_.]{3,20}$/, {
    message: 'El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números, _ o .)',
  })
  nombreUsuario: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Debés repetir la contraseña' })
  repetirPassword: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(200)
  descripcion: string;
}
