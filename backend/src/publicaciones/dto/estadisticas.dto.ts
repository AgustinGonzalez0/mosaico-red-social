import { IsDateString } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export class EstadisticasDto {
  @IsDateString({}, { message: 'desde debe ser una fecha válida' }) desde: string;
  @IsDateString({}, { message: 'hasta debe ser una fecha válida' }) hasta: string;
}

export function rangoUtc(dto: EstadisticasDto): { desde: Date; hasta: Date } {
  const desde = new Date(`${dto.desde}T00:00:00.000Z`);
  const hasta = new Date(`${dto.hasta}T00:00:00.000Z`);
  if (desde > hasta) throw new BadRequestException('desde no puede ser posterior a hasta');
  hasta.setUTCDate(hasta.getUTCDate() + 1);
  return { desde, hasta };
}
