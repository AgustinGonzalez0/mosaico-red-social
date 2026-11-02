import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { subirImagen } from '../common/imagen.js';
import { Paginado, paginado } from '../common/paginacion.js';
import { User } from '../users/schemas/user.schema.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import {
  ListarPublicacionesDto,
  Orden,
} from './dto/listar-publicaciones.dto.js';
import { Publicacion } from './schemas/publicacion.schema.js';

/** Forma en que el frontend recibe una publicación. */
export interface PublicacionRespuesta {
  id: string;
  titulo: string;
  mensaje: string;
  imagen: string | null;
  ancho: number | null;
  alto: number | null;
  autor: { id: string; nombreUsuario: string; imagenPerfil: string | null };
  /** Cantidad total de "me gusta" (no se exponen los ids de quienes los dieron). */
  meGusta: number;
  /** Si el usuario que hace la consulta ya le dio "me gusta". */
  leGusta: boolean;
  createdAt: Date;
}

export interface EstadoMeGusta {
  meGusta: number;
  leGusta: boolean;
}

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicaciones: Model<Publicacion>,
    @InjectModel(User.name) private readonly usuarios: Model<User>,
  ) {}

  /** Alta: el autor siempre es el usuario autenticado, nunca un dato enviado por el cliente. */
  async crear(
    dto: CrearPublicacionDto,
    imagen: Express.Multer.File | undefined,
    autor: UsuarioAutenticado,
  ): Promise<PublicacionRespuesta> {
    // La imagen se sube a Cloudinary; en MongoDB solo se guarda su URL.
    const subida = imagen ? await subirImagen(imagen, 'publicaciones') : null;

    const creada = await this.publicaciones.create({
      autor: new Types.ObjectId(autor.id),
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      imagen: subida?.url ?? null,
      ancho: subida?.ancho ?? null,
      alto: subida?.alto ?? null,
    });

    const [respuesta] = await this.consultar(
      { _id: creada._id },
      autor.id,
      'fecha',
      0,
      1,
    );
    return respuesta;
  }

  /** Listado paginado (offset/limit), con orden y filtro por autor resueltos en MongoDB. */
  async listar(
    query: ListarPublicacionesDto,
    usuarioId: string,
  ): Promise<Paginado<PublicacionRespuesta>> {
    const filtro = query.autor
      ? { activa: true, autor: new Types.ObjectId(query.autor) }
      : { activa: true };

    const [data, total] = await Promise.all([
      this.consultar(filtro, usuarioId, query.orden, query.offset, query.limit),
      this.publicaciones.countDocuments(filtro),
    ]);
    return paginado(data, total, query.offset, query.limit);
  }

  async obtener(id: string, usuarioId: string): Promise<PublicacionRespuesta> {
    const [publicacion] = await this.consultar(
      { _id: new Types.ObjectId(id), activa: true },
      usuarioId,
      'fecha',
      0,
      1,
    );
    if (!publicacion)
      throw new NotFoundException('La publicación no existe o fue eliminada');
    return publicacion;
  }

  /** Baja lógica: la publicación queda con activa=false. Solo su autor o un administrador. */
  async eliminar(id: string, usuario: UsuarioAutenticado): Promise<void> {
    const publicacion = await this.publicaciones
      .findOne({ _id: id, activa: true }, { autor: 1 })
      .lean();
    if (!publicacion)
      throw new NotFoundException(
        'La publicación no existe o ya fue eliminada',
      );

    const esAutor = publicacion.autor.toString() === usuario.id;
    if (!esAutor && usuario.perfil !== 'administrador') {
      throw new ForbiddenException(
        'Solo podés eliminar tus propias publicaciones',
      );
    }

    await this.publicaciones.updateOne(
      { _id: id },
      { $set: { activa: false } },
    );
  }

  async darMeGusta(id: string, usuarioId: string): Promise<EstadoMeGusta> {
    const usuario = new Types.ObjectId(usuarioId);
    const actualizada = await this.publicaciones
      .findOneAndUpdate(
        { _id: id, activa: true, meGusta: { $ne: usuario } },
        { $addToSet: { meGusta: usuario } },
        { returnDocument: 'after', projection: { meGusta: 1 } },
      )
      .lean();

    if (!actualizada)
      throw await this.errorDeEstado(
        id,
        'Ya le diste me gusta a esta publicación',
      );
    return this.estado(actualizada.meGusta, usuarioId);
  }

  /** Solo se puede quitar un "me gusta" que el usuario había dado (el filtro exige que esté en el arreglo). */
  async quitarMeGusta(id: string, usuarioId: string): Promise<EstadoMeGusta> {
    const usuario = new Types.ObjectId(usuarioId);
    const actualizada = await this.publicaciones
      .findOneAndUpdate(
        { _id: id, activa: true, meGusta: usuario },
        { $pull: { meGusta: usuario } },
        { returnDocument: 'after', projection: { meGusta: 1 } },
      )
      .lean();

    if (!actualizada) {
      throw await this.errorDeEstado(
        id,
        'No le habías dado me gusta a esta publicación',
      );
    }
    return this.estado(actualizada.meGusta, usuarioId);
  }

  /**
   * Aggregation pipeline: filtra, ordena, pagina y recién entonces resuelve el autor.
   * El orden por "me gusta" usa la cantidad real de elementos del arreglo ($size).
   */
  private consultar(
    filtro: Record<string, unknown>,
    usuarioId: string,
    orden: Orden,
    offset: number,
    limit: number,
  ): Promise<PublicacionRespuesta[]> {
    const usuario = new Types.ObjectId(usuarioId);

    const ordenar: PipelineStage[] =
      orden === 'meGusta'
        ? [
            { $addFields: { cantidadMeGusta: { $size: '$meGusta' } } },
            // Desempate estable: a igual cantidad, la más reciente primero (y _id para empates exactos).
            { $sort: { cantidadMeGusta: -1, createdAt: -1, _id: -1 } },
          ]
        : [{ $sort: { createdAt: -1, _id: -1 } }];

    return this.publicaciones
      .aggregate<PublicacionRespuesta>([
        { $match: filtro },
        ...ordenar,
        { $skip: offset },
        { $limit: limit },
        {
          $lookup: {
            from: this.usuarios.collection.name,
            localField: 'autor',
            foreignField: '_id',
            // Solo los campos públicos: el hash de la contraseña nunca sale de MongoDB.
            pipeline: [{ $project: { nombreUsuario: 1, imagenPerfil: 1 } }],
            as: 'datosAutor',
          },
        },
        { $unwind: { path: '$datosAutor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            titulo: 1,
            mensaje: 1,
            imagen: 1,
            ancho: 1,
            alto: 1,
            createdAt: 1,
            autor: {
              id: { $toString: '$autor' },
              nombreUsuario: {
                $ifNull: ['$datosAutor.nombreUsuario', 'usuario eliminado'],
              },
              imagenPerfil: { $ifNull: ['$datosAutor.imagenPerfil', null] },
            },
            meGusta: { $size: '$meGusta' },
            leGusta: { $in: [usuario, '$meGusta'] },
          },
        },
      ])
      .exec();
  }

  private estado(meGusta: Types.ObjectId[], usuarioId: string): EstadoMeGusta {
    return {
      meGusta: meGusta.length,
      leGusta: meGusta.some((usuario) => usuario.toString() === usuarioId),
    };
  }

  /** La operación no encontró nada que modificar: 404 si la publicación no existe, 409 si ya estaba en ese estado. */
  private async errorDeEstado(
    id: string,
    conflicto: string,
  ): Promise<HttpException> {
    const existe = await this.publicaciones.exists({ _id: id, activa: true });
    return existe
      ? new ConflictException(conflicto)
      : new NotFoundException('La publicación no existe o fue eliminada');
  }
}
