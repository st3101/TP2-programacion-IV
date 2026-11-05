import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion } from '../database/schemas/publicacion.schema.js';
import { Usuario } from '../database/schemas/usuario.schema.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { CreatePublicacionDto } from './dto/create-publicacion.dto.js';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name) private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll() {
    const publicaciones = await this.publicacionModel
      .find({ eliminadaEn: null })
      .sort({ createdAt: -1 })
      .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
      .lean();

    return publicaciones.map((publicacion) => ({
      id: publicacion._id.toString(),
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
      imagenUrl: publicacion.imagenUrl,
      createdAt: publicacion.createdAt,
      autor: publicacion.autorId,
    }));
  }

  async create(usuarioId: string, dto: CreatePublicacionDto, image?: { buffer: Buffer; mimetype: string }) {
    const usuarioExiste = await this.usuarioModel.exists({ _id: new Types.ObjectId(usuarioId) });
    if (!usuarioExiste) throw new NotFoundException('No se encontró el usuario de la sesión.');

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
    };
  }
}
