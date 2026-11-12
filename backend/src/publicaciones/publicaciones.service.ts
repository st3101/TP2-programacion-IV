import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion } from '../database/schemas/publicacion.schema';
import { MeGusta } from '../database/schemas/me-gusta.schema';
import { Comentario } from '../database/schemas/comentario.schema';
import { Usuario } from '../database/schemas/usuario.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';

@Injectable()
export class PublicacionesService {
  constructor(
    // Inyecta los modelos de Mongoose para las entidades Publicacion, Usuario, MeGusta y Comentario, así como el servicio de Cloudinary para manejar imágenes.
    @InjectModel(Publicacion.name) private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(MeGusta.name) private readonly meGustaModel: Model<MeGusta>,
    @InjectModel(Comentario.name) private readonly comentarioModel: Model<Comentario>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  //Busca todas las publicaciones con paginacion ordenadas
  async findAll(
    offset: number,
    limit: number,
    order: 'fecha' | 'me-gusta',
    usuarioId?: string,
    username?: string,
  ) {
    const filter: Record<string, unknown> = { eliminadaEn: null };
    if (usuarioId) {
      filter.autorId = new Types.ObjectId(usuarioId);
    } else if (username?.trim()) {
      const terms = username.trim().split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const users = await this.usuarioModel.find({
        $and: terms.map((term) => ({
          $or: [
            { nombreUsuario: { $regex: term, $options: 'i' } },
            { nombre: { $regex: term, $options: 'i' } },
            { apellido: { $regex: term, $options: 'i' } },
          ],
        })),
      }).select('_id');
      if (!users.length) return { items: [], offset, limit, total: 0, hasMore: false };
      filter.autorId = { $in: users.map((user) => user._id) };
    }

    const sort: Record<string, 1 | -1> = order === 'me-gusta'
      ? { likes: -1, createdAt: -1, _id: -1 }
      : { createdAt: -1, _id: -1 };
    const [ranked, total] = await Promise.all([
      this.publicacionModel.aggregate<{ _id: Types.ObjectId; likes: number; comentarios: number }>([
        { $match: filter },
        {
          $lookup: {
            from: 'me_gusta',
            localField: '_id',
            foreignField: 'publicacionId',
            pipeline: [{ $match: { eliminadaEn: null } }],
            as: 'likesData',
          },
        },
        {
          $lookup: {
            from: 'comentarios',
            localField: '_id',
            foreignField: 'publicacionId',
            pipeline: [{ $match: { eliminadaEn: null } }],
            as: 'commentsData',
          },
        },
        { $project: { _id: 1, createdAt: 1, likes: { $size: '$likesData' }, comentarios: { $size: '$commentsData' } } },
        { $sort: sort },
        { $skip: offset },
        { $limit: limit },
      ]),
      this.publicacionModel.countDocuments(filter),
    ]);

    const publicaciones = ranked.length
      ? await this.publicacionModel
          .find({ _id: { $in: ranked.map((item) => item._id) } })
          .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
          .lean()
      : [];
    const publicacionesById = new Map(publicaciones.map((publication) => [publication._id.toString(), publication]));

    const items = ranked.flatMap((rank) => {
      const publicacion = publicacionesById.get(rank._id.toString());
      if (!publicacion) return [];
      const autor = publicacion.autorId as unknown as {
        _id: Types.ObjectId;
        nombre: string;
        apellido: string;
        nombreUsuario: string;
        imagenPerfilUrl: string;
      };

      return [{
        id: publicacion._id.toString(),
        titulo: publicacion.titulo,
        descripcion: publicacion.descripcion,
        imagenUrl: publicacion.imagenUrl,
        createdAt: publicacion.createdAt,
        likes: rank.likes,
        comentarios: rank.comentarios,
        autor: autor ? {
          id: autor._id.toString(),
          nombre: autor.nombre,
          apellido: autor.apellido,
          nombreUsuario: autor.nombreUsuario,
          imagenPerfilUrl: autor.imagenPerfilUrl,
        } : null,
      }];
    });

    return { items, offset, limit, total, hasMore: offset + items.length < total };
  }

  //Busca los comentarios de una publicación específica, verificando que la publicación exista y no esté eliminada.
  async findComments(publicationId: string) {
    const publicationObjectId = this.toPublicationObjectId(publicationId);
    const publicationExists = await this.publicacionModel.exists({ _id: publicationObjectId, eliminadaEn: null });
    if (!publicationExists) throw new NotFoundException('No se encontró la publicación.');

    const comments = await this.comentarioModel
      .find({ publicacionId: publicationObjectId, eliminadaEn: null })
      .sort({ createdAt: 1, _id: 1 })
      .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
      .lean();

    return comments.map((comment) => {
      const author = comment.autorId as unknown as {
        _id: Types.ObjectId;
        nombre: string;
        apellido: string;
        nombreUsuario: string;
        imagenPerfilUrl: string;
      };
      return {
        id: comment._id.toString(),
        mensaje: comment.mensaje,
        createdAt: comment.createdAt,
        autor: author ? {
          id: author._id.toString(),
          nombre: author.nombre,
          apellido: author.apellido,
          nombreUsuario: author.nombreUsuario,
          imagenPerfilUrl: author.imagenPerfilUrl,
        } : null,
      };
    });
  }

  //Crea un comentario en una publicacion
  async createComment(usuarioId: string, publicationId: string, dto: CreateComentarioDto) {
    const publicationObjectId = this.toPublicationObjectId(publicationId);
    const publicationExists = await this.publicacionModel.exists({ _id: publicationObjectId, eliminadaEn: null });
    if (!publicationExists) throw new NotFoundException('No se encontró la publicación.');

    const author = await this.usuarioModel.findById(usuarioId)
      .select('nombre apellido nombreUsuario imagenPerfilUrl');
    if (!author) throw new NotFoundException('No se encontró el usuario de la sesión.');

    const comment = await this.comentarioModel.create({
      publicacionId: publicationObjectId,
      autorId: new Types.ObjectId(usuarioId),
      mensaje: dto.mensaje.trim(),
    });

    return {
      id: comment._id.toString(),
      mensaje: comment.mensaje,
      createdAt: comment.createdAt,
      autor: {
        id: author._id.toString(),
        nombre: author.nombre,
        apellido: author.apellido,
        nombreUsuario: author.nombreUsuario,
        imagenPerfilUrl: author.imagenPerfilUrl,
      },
    };
  }

  //busca los likes de un usuario específico, devolviendo los IDs de las publicaciones a las que le ha dado "Me gusta".
  async findMyLikes(usuarioId: string) {
    const likes = await this.meGustaModel
      .find({ usuarioId: new Types.ObjectId(usuarioId), eliminadaEn: null })
      .select('publicacionId')
      .lean();
    return { publicacionIds: likes.map((like) => like.publicacionId.toString()) };
  }

  //Agrega un megusta a una publicación específica
  async addLike(usuarioId: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicacionObjectId = new Types.ObjectId(publicationId);
    const publicacion = await this.publicacionModel.findOne({ _id: publicacionObjectId, eliminadaEn: null }).select('_id');
    if (!publicacion) throw new NotFoundException('No se encontró la publicación.');

    const usuarioObjectId = new Types.ObjectId(usuarioId);
    try {
      await this.meGustaModel.updateOne(
        { usuarioId: usuarioObjectId, publicacionId: publicacionObjectId },
        { $set: { eliminadaEn: null } },
        { upsert: true },
      );
    } catch (error) {
      // Dos peticiones simultáneas pueden intentar crear el mismo like.
      if (!this.isDuplicateKeyError(error)) throw error;
    }

    const likes = await this.meGustaModel.countDocuments({ publicacionId: publicacionObjectId, eliminadaEn: null });
    return { liked: true, likes };
  }

//Elimina un megusta de una publicación específica
  async removeLike(usuarioId: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicacionObjectId = new Types.ObjectId(publicationId);
    const publicacion = await this.publicacionModel.findOne({ _id: publicacionObjectId, eliminadaEn: null }).select('_id');
    if (!publicacion) throw new NotFoundException('No se encontró la publicación.');

    const usuarioObjectId = new Types.ObjectId(usuarioId);
    const existingLike = await this.meGustaModel.findOneAndUpdate({
      usuarioId: usuarioObjectId,
      publicacionId: publicacionObjectId,
      eliminadaEn: null,
    }, { $set: { eliminadaEn: new Date() } });
    if (!existingLike) throw new NotFoundException('No habías dado Me gusta a esta publicación.');

    const likes = await this.meGustaModel.countDocuments({ publicacionId: publicacionObjectId, eliminadaEn: null });
    return { liked: false, likes };
  }

  //Elimina una publicación propia y eliminando los megusta
  async deleteOwn(usuarioId: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicationObjectId = new Types.ObjectId(publicationId);
    const publication = await this.publicacionModel.findById(publicationObjectId).select('autorId eliminadaEn imagenPublicId');
    if (!publication || publication.eliminadaEn) throw new NotFoundException('No se encontró la publicación.');
    if (publication.autorId.toString() !== usuarioId) {
      throw new ForbiddenException('Solo podés eliminar tus propias publicaciones.');
    }

    const deleted = await this.publicacionModel.findOneAndUpdate(
      { _id: publicationObjectId, autorId: new Types.ObjectId(usuarioId), eliminadaEn: null },
      { $set: { eliminadaEn: new Date() } },
      { new: true },
    ).select('_id');
    if (!deleted) throw new NotFoundException('La publicación ya no existe.');

    return { message: 'Publicación eliminada.' };
  }

  //Crea una nueva publicación, subiendo la imagen a Cloudinary 
  async create(usuarioId: string, dto: CreatePublicacionDto, image?: { buffer: Buffer; mimetype: string }) {
    const usuario = await this.usuarioModel.findById(usuarioId).select('nombre apellido nombreUsuario imagenPerfilUrl');
    if (!usuario) throw new NotFoundException('No se encontró el usuario de la sesión.');

    const uploadedImage = image
      ? await this.cloudinaryService.uploadImage(image.buffer, 'lobby/publicaciones')
      : undefined;

    let publicacion;
    try {
      publicacion = await this.publicacionModel.create({
        autorId: new Types.ObjectId(usuarioId),
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion.trim(),
        imagenUrl: uploadedImage?.url ?? dto.imagenUrl?.trim() ?? '',
        imagenPublicId: uploadedImage?.publicId ?? '',
      });
    } catch (error) {
      if (uploadedImage) await this.cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => undefined);
      throw error;
    }

    return {
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
      imagenUrl: publicacion.imagenUrl,
      createdAt: publicacion.createdAt,
      autor: {
        id: usuario._id.toString(),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        nombreUsuario: usuario.nombreUsuario,
        imagenPerfilUrl: usuario.imagenPerfilUrl,
      },
    };
  }

  // Verifica si un error es un error de clave duplicada (código 11000) en MongoDB.
  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }

  //transforma un ID de publicación en un ObjectId de Mongoose, lanzando una excepción si el ID no es válido.
  private toPublicationObjectId(publicationId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }
    return new Types.ObjectId(publicationId);
  }
}
