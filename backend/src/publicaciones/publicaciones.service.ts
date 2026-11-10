import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion } from '../database/schemas/publicacion.schema';
import { MeGusta } from '../database/schemas/me-gusta.schema';
import { Usuario } from '../database/schemas/usuario.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name) private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(MeGusta.name) private readonly meGustaModel: Model<MeGusta>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll() {
    const publicaciones = await this.publicacionModel
      .find({ eliminadaEn: null })
      .sort({ createdAt: -1 })
      .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
      .lean();

    const likes = publicaciones.length
      ? await this.meGustaModel.aggregate<{ _id: Types.ObjectId; cantidad: number }>([
          { $match: { publicacionId: { $in: publicaciones.map((publicacion) => publicacion._id) } } },
          { $group: { _id: '$publicacionId', cantidad: { $sum: 1 } } },
        ])
      : [];
    const likesByPublication = new Map(likes.map((like) => [like._id.toString(), like.cantidad]));

    return publicaciones.map((publicacion) => {
      const autor = publicacion.autorId as unknown as {
        _id: Types.ObjectId;
        nombre: string;
        apellido: string;
        nombreUsuario: string;
        imagenPerfilUrl: string;
      };

      return {
        id: publicacion._id.toString(),
        titulo: publicacion.titulo,
        descripcion: publicacion.descripcion,
        imagenUrl: publicacion.imagenUrl,
        createdAt: publicacion.createdAt,
        likes: likesByPublication.get(publicacion._id.toString()) ?? 0,
        autor: autor ? {
          id: autor._id.toString(),
          nombre: autor.nombre,
          apellido: autor.apellido,
          nombreUsuario: autor.nombreUsuario,
          imagenPerfilUrl: autor.imagenPerfilUrl,
        } : null,
      };
    });
  }

  async findMyLikes(usuarioId: string) {
    const likes = await this.meGustaModel.find({ usuarioId: new Types.ObjectId(usuarioId) }).select('publicacionId').lean();
    return { publicacionIds: likes.map((like) => like.publicacionId.toString()) };
  }

  async toggleLike(usuarioId: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicacionObjectId = new Types.ObjectId(publicationId);
    const publicacion = await this.publicacionModel.findOne({ _id: publicacionObjectId, eliminadaEn: null }).select('_id');
    if (!publicacion) throw new NotFoundException('No se encontró la publicación.');

    const usuarioObjectId = new Types.ObjectId(usuarioId);
    const existingLike = await this.meGustaModel.findOneAndDelete({
      usuarioId: usuarioObjectId,
      publicacionId: publicacionObjectId,
    });
    let liked = false;
    if (!existingLike) {
      try {
        await this.meGustaModel.create({ usuarioId: usuarioObjectId, publicacionId: publicacionObjectId });
        liked = true;
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) throw error;
        liked = true;
      }
    }

    const likes = await this.meGustaModel.countDocuments({ publicacionId: publicacionObjectId });
    return { liked, likes };
  }

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

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }
}
