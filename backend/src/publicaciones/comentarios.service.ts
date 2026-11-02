import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginacionQueryDto, Paginado, paginado } from '../common/paginacion.js';
import { Comentario } from './schemas/comentario.schema.js';
import { Publicacion } from './schemas/publicacion.schema.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';

export interface ComentarioRespuesta {
  id: string;
  mensaje: string;
  modificado: boolean;
  autor: { id: string; nombreUsuario: string; imagenPerfil: string | null };
  createdAt: Date;
}

type AutorPoblado = { _id: Types.ObjectId; nombreUsuario: string; imagenPerfil: string | null };

/** Sprint 2: solo lectura de los comentarios de una publicación. Alta y edición llegan en el Sprint 3. */
@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario.name) private readonly comentarios: Model<Comentario>,
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
  ) {}

  async crear(publicacionId: string, dto: CrearComentarioDto, usuarioId: string) {
    await this.verificarPublicacion(publicacionId);
    const comentario = await this.comentarios.create({
      publicacion: publicacionId,
      autor: usuarioId,
      mensaje: dto.mensaje,
    });
    return this.obtenerPorId(comentario._id.toString());
  }

  async editar(publicacionId: string, comentarioId: string, dto: CrearComentarioDto, usuarioId: string) {
    const comentario = await this.comentarios.findOne({ _id: comentarioId, publicacion: publicacionId });
    if (!comentario) throw new NotFoundException('El comentario no existe');
    if (comentario.autor.toString() !== usuarioId) throw new ForbiddenException('Solo podés editar tus comentarios');
    comentario.mensaje = dto.mensaje;
    comentario.modificado = true;
    await comentario.save();
    return this.obtenerPorId(comentarioId);
  }

  async listar(
    publicacionId: string,
    { offset, limit }: PaginacionQueryDto,
  ): Promise<Paginado<ComentarioRespuesta>> {
    const existe = await this.publicaciones.exists({ _id: publicacionId, activa: true });
    if (!existe) throw new NotFoundException('La publicación no existe o fue eliminada');

    const filtro = { publicacion: new Types.ObjectId(publicacionId) };
    const [docs, total] = await Promise.all([
      this.comentarios
        .find(filtro)
        .sort({ createdAt: -1, _id: -1 }) // los más recientes primero
        .skip(offset)
        .limit(limit)
        .populate<{ autor: AutorPoblado | null }>('autor', 'nombreUsuario imagenPerfil')
        .lean()
        .exec(),
      this.comentarios.countDocuments(filtro),
    ]);

    const data = docs.map((doc) => ({
      id: doc._id.toString(),
      mensaje: doc.mensaje,
      modificado: doc.modificado,
      autor: {
        id: doc.autor?._id.toString() ?? '',
        nombreUsuario: doc.autor?.nombreUsuario ?? 'usuario eliminado',
        imagenPerfil: doc.autor?.imagenPerfil ?? null,
      },
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    }));
    return paginado(data, total, offset, limit);
  }

  private async verificarPublicacion(publicacionId: string): Promise<void> {
    const existe = await this.publicaciones.exists({ _id: publicacionId, activa: true });
    if (!existe) throw new NotFoundException('La publicación no existe o fue eliminada');
  }

  private async obtenerPorId(id: string): Promise<ComentarioRespuesta> {
    const comentario = await this.comentarios
      .findById(id)
      .populate<{ autor: AutorPoblado | null }>('autor', 'nombreUsuario imagenPerfil')
      .lean()
      .exec();
    if (!comentario) throw new NotFoundException('El comentario no existe');
    return {
      id: comentario._id.toString(),
      mensaje: comentario.mensaje,
      modificado: comentario.modificado,
      autor: {
        id: comentario.autor?._id.toString() ?? '',
        nombreUsuario: comentario.autor?.nombreUsuario ?? 'usuario eliminado',
        imagenPerfil: comentario.autor?.imagenPerfil ?? null,
      },
      createdAt: (comentario as unknown as { createdAt: Date }).createdAt,
    };
  }
}
