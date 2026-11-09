import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion } from '../database/schemas/publicacion.schema';
import { Usuario } from '../database/schemas/usuario.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';

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
}
