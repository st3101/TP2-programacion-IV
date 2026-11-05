import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { Comentario } from '../database/schemas/comentario.schema.js';
import { Publicacion } from '../database/schemas/publicacion.schema.js';
import { Usuario } from '../database/schemas/usuario.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Publicacion.name) private readonly publicacionModel: Model<Publicacion>,
    @InjectModel(Comentario.name) private readonly comentarioModel: Model<Comentario>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getMyProfile(usuarioId: string) {
    const usuario = await this.usuarioModel.findById(usuarioId);
    if (!usuario) throw new NotFoundException('No se encontró el usuario.');

    const publicaciones = await this.publicacionModel
      .find({ autorId: new Types.ObjectId(usuarioId), eliminadaEn: null })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const comentarios = publicaciones.length
      ? await this.comentarioModel
          .find({ publicacionId: { $in: publicaciones.map((publicacion) => publicacion._id) } })
          .sort({ createdAt: 1 })
          .populate('autorId', 'nombre apellido nombreUsuario')
          .lean()
      : [];

    return {
      usuario: this.toPublicUser(usuario),
      publicaciones: publicaciones.map((publicacion) => ({
        id: publicacion._id.toString(),
        titulo: publicacion.titulo,
        descripcion: publicacion.descripcion,
        imagenUrl: publicacion.imagenUrl,
        createdAt: publicacion.createdAt,
        comentarios: comentarios
          .filter((comentario) => comentario.publicacionId.toString() === publicacion._id.toString())
          .map((comentario) => {
            const autor = comentario.autorId as unknown as {
              _id: Types.ObjectId;
              nombre: string;
              apellido: string;
              nombreUsuario: string;
            };

            return {
              id: comentario._id.toString(),
              mensaje: comentario.mensaje,
              createdAt: comentario.createdAt,
              autor: {
                id: autor._id.toString(),
                nombre: autor.nombre,
                apellido: autor.apellido,
                nombreUsuario: autor.nombreUsuario,
              },
            };
          }),
      })),
    };
  }

  async updateMyProfile(
    usuarioId: string,
    dto: UpdateProfileDto,
    image?: { buffer: Buffer; mimetype: string },
  ) {
    const updates: Record<string, unknown> = {};
    const currentUser = image ? await this.usuarioModel.findById(usuarioId) : null;
    if (image && !currentUser) throw new NotFoundException('No se encontró el usuario.');
    if (dto.nombre !== undefined) updates.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) updates.apellido = dto.apellido.trim();
    if (dto.fechaNacimiento !== undefined) updates.fechaNacimiento = new Date(dto.fechaNacimiento);
    if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion.trim();
    if (dto.nombreUsuario !== undefined) {
      const nombreUsuario = dto.nombreUsuario.trim().toLowerCase();
      const existingUser = await this.usuarioModel.findOne({
        nombreUsuario,
        _id: { $ne: new Types.ObjectId(usuarioId) },
      });
      if (existingUser) throw new ConflictException('Ese nombre de usuario ya está en uso.');
      updates.nombreUsuario = nombreUsuario;
    }

    const uploadedImage = image
      ? await this.cloudinaryService.uploadImage(image.buffer, 'lobby/perfiles')
      : undefined;
    if (uploadedImage) {
      updates.imagenPerfilUrl = uploadedImage.url;
      updates.imagenPerfilPublicId = uploadedImage.publicId;
    }

    if (Object.keys(updates).length) {
      try {
        const usuario = await this.usuarioModel.findByIdAndUpdate(
          usuarioId,
          { $set: updates },
          { new: true, runValidators: true },
        );
        if (!usuario) throw new NotFoundException('No se encontró el usuario.');
        if (uploadedImage && currentUser?.imagenPerfilPublicId) {
          await this.cloudinaryService.deleteImage(currentUser.imagenPerfilPublicId).catch(() => undefined);
        }
      } catch (error) {
        if (uploadedImage) await this.cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => undefined);
        if (this.isDuplicateKeyError(error)) {
          throw new ConflictException('Ese nombre de usuario ya está en uso.');
        }
        throw error;
      }
    }

    return this.getMyProfile(usuarioId);
  }

  private toPublicUser(usuario: HydratedDocument<Usuario>) {
    return {
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      fechaNacimiento: usuario.fechaNacimiento,
      descripcion: usuario.descripcion,
      imagenPerfilUrl: usuario.imagenPerfilUrl,
      perfil: usuario.perfil,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }
}
