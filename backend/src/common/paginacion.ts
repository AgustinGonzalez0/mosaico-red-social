import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const LIMITE_POR_DEFECTO = 12;
export const LIMITE_MAXIMO = 50;

/** Parámetros de paginación por offset/limit: `?offset=0&limit=12`. */
export class PaginacionQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'offset debe ser un número entero' })
  @Min(0, { message: 'offset no puede ser negativo' })
  offset: number = 0;

  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(LIMITE_MAXIMO, { message: `limit no puede superar ${LIMITE_MAXIMO}` })
  limit: number = LIMITE_POR_DEFECTO;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function paginado<T>(data: T[], total: number, offset: number, limit: number): Paginado<T> {
  return { data, total, offset, limit, hasMore: offset + data.length < total };
}
