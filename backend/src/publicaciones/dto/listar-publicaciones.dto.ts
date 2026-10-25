import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PaginacionQueryDto } from '../../common/paginacion.js';

export const ORDENES = ['fecha', 'meGusta'] as const;
export type Orden = (typeof ORDENES)[number];

/** Query de GET /publicaciones: `?orden=fecha|meGusta&autor=<id>&offset=0&limit=12`. */
export class ListarPublicacionesDto extends PaginacionQueryDto {
  @IsIn(ORDENES, { message: 'orden debe ser "fecha" o "meGusta"' })
  orden: Orden = 'fecha';

  @IsOptional()
  @IsMongoId({ message: 'autor no es un identificador válido' })
  autor?: string;
}
