import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comentario } from './schemas/comentario.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { EstadisticasDto, rangoUtc } from './dto/estadisticas.dto.js';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
    @InjectModel(Comentario.name) private readonly comentarios: Model<Comentario>,
    @InjectModel(User.name) private readonly usuarios: Model<User>,
  ) {}

  publicacionesPorUsuario(dto: EstadisticasDto) {
    const { desde, hasta } = rangoUtc(dto);
    return this.publicaciones.aggregate([
      { $match: { createdAt: { $gte: desde, $lt: hasta } } },
      { $group: { _id: '$autor', cantidad: { $sum: 1 } } },
      { $lookup: { from: this.usuarios.collection.name, localField: '_id', foreignField: '_id', as: 'usuario' } },
      { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, usuarioId: { $toString: '$_id' }, nombreUsuario: { $ifNull: ['$usuario.nombreUsuario', 'usuario eliminado'] }, cantidad: 1 } },
      { $sort: { cantidad: -1, nombreUsuario: 1, usuarioId: 1 } },
    ]).exec();
  }

  async comentariosPorFecha(dto: EstadisticasDto) {
    const { desde, hasta } = rangoUtc(dto);
    const rows = await this.comentarios.aggregate([
      { $match: { createdAt: { $gte: desde, $lt: hasta } } },
      { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' } }, cantidad: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).exec() as { _id: string; cantidad: number }[];
    const porDia = new Map(rows.map((row) => [row._id, row.cantidad]));
    const data: { fecha: string; cantidad: number }[] = [];
    for (const fecha = new Date(desde); fecha < hasta; fecha.setUTCDate(fecha.getUTCDate() + 1)) {
      const clave = fecha.toISOString().slice(0, 10);
      data.push({ fecha: clave, cantidad: porDia.get(clave) ?? 0 });
    }
    return data;
  }

  comentariosPorPublicacion(dto: EstadisticasDto) {
    const { desde, hasta } = rangoUtc(dto);
    return this.comentarios.aggregate([
      { $match: { createdAt: { $gte: desde, $lt: hasta } } },
      { $group: { _id: '$publicacion', cantidad: { $sum: 1 } } },
      { $lookup: { from: this.publicaciones.collection.name, localField: '_id', foreignField: '_id', as: 'publicacion' } },
      { $unwind: { path: '$publicacion', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, publicacionId: { $toString: '$_id' }, titulo: { $ifNull: ['$publicacion.titulo', 'publicación eliminada'] }, cantidad: 1 } },
      { $sort: { cantidad: -1, titulo: 1, publicacionId: 1 } },
    ]).exec();
  }
}
