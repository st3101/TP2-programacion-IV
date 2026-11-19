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

type PublicacionOrdenada = {
  _id: Types.ObjectId;
  createdAt: Date;
  likes: number;
  comentarios: number;
};

type AutorDePublicacion = {
  _id: Types.ObjectId;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  imagenPerfilUrl: string;
};

type PublicacionCompleta = {
  _id: Types.ObjectId;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  createdAt: Date;
  autorId: unknown;
};

type PublicacionParaElFeed = {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  createdAt: Date;
  likes: number;
  comentarios: number;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    nombreUsuario: string;
    imagenPerfilUrl: string;
  } | null;
};

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

  // Coordina los pasos necesarios para devolver una página de publicaciones.
  async findAll(
    pagina: number,
    cantidad: number,
    orden: 'fecha' | 'me-gusta',
    usuarioId?: string,
    nombreBuscado?: string,
  ) {
    const desplazamiento = (pagina - 1) * cantidad;
    const filtro = await this.crearFiltroPublicaciones(usuarioId, nombreBuscado);

    if (filtro === null) {
      return this.crearRespuestaVacia(pagina, cantidad);
    }

    const ordenMongo = this.obtenerOrdenPublicaciones(orden);
    const { publicacionesOrdenadas, total } = await this.buscarPaginaYTotal(
      filtro,
      ordenMongo,
      desplazamiento,
      cantidad,
    );
    const publicacionesCompletas = await this.buscarPublicacionesCompletas(publicacionesOrdenadas);
    const items = this.prepararPublicaciones(publicacionesOrdenadas, publicacionesCompletas);
    const paginasTotales = Math.ceil(total / cantidad);

    return { items, pagina, cantidad, total, paginasTotales };
  }

  // Arma el filtro base y, si se pidió, agrega el filtro por usuario.
  private async crearFiltroPublicaciones(
    usuarioId?: string,
    nombreBuscado?: string,
  ): Promise<Record<string, unknown> | null> {
    const filtro: Record<string, unknown> = { eliminadaEn: null };

    if (usuarioId) {
      filtro.autorId = new Types.ObjectId(usuarioId);
    } else if (nombreBuscado?.trim()) {
      const usuarios = await this.buscarUsuariosPorNombre(nombreBuscado);

      if (usuarios.length === 0) {
        return null;
      }

      filtro.autorId = { $in: usuarios.map((usuario) => usuario._id) };
    }

    return filtro;
  }

  // Busca coincidencias en nombre de usuario, nombre y apellido.
  private async buscarUsuariosPorNombre(nombreBuscado: string) {
    const terminos = nombreBuscado
      .trim()
      .split(/\s+/)
      .map((termino) => termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    return this.usuarioModel.find({
      $and: terminos.map((termino) => ({
        $or: [
          { nombreUsuario: { $regex: termino, $options: 'i' } },
          { nombre: { $regex: termino, $options: 'i' } },
          { apellido: { $regex: termino, $options: 'i' } },
        ],
      })),
    }).select('_id');
  }

  // Devuelve el orden que MongoDB debe aplicar.
  private obtenerOrdenPublicaciones(orden: 'fecha' | 'me-gusta'): Record<string, 1 | -1> {
    if (orden === 'me-gusta') {
      return { likes: -1, createdAt: -1, _id: -1 };
    } else {
      return { createdAt: -1, _id: -1 };
    }
  }

  // Busca las publicaciones de la página y cuenta cuántas hay en total.
  private async buscarPaginaYTotal(
    filtro: Record<string, unknown>,
    orden: Record<string, 1 | -1>,
    desplazamiento: number,
    cantidad: number,
  ): Promise<{ publicacionesOrdenadas: PublicacionOrdenada[]; total: number }> {
    const [publicacionesOrdenadas, total] = await Promise.all([
      this.publicacionModel.aggregate<PublicacionOrdenada>([
        { $match: filtro },
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
            as: 'comentariosData',
          },
        },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            likes: { $size: '$likesData' },
            comentarios: { $size: '$comentariosData' },
          },
        },
        { $sort: orden },
        { $skip: desplazamiento },
        { $limit: cantidad },
      ]),
      this.publicacionModel.countDocuments(filtro),
    ]);

    return { publicacionesOrdenadas, total };
  }

  // Trae el contenido completo y los datos visibles de los autores.
  private async buscarPublicacionesCompletas(publicacionesOrdenadas: PublicacionOrdenada[]) {
    const idsPublicaciones = publicacionesOrdenadas.map((publicacion) => publicacion._id);

    return this.publicacionModel
      .find({ _id: { $in: idsPublicaciones } })
      .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
      .lean();
  }

  // Combina los datos completos con los likes y comentarios contados.
  private prepararPublicaciones(
    publicacionesOrdenadas: PublicacionOrdenada[],
    publicacionesCompletas: PublicacionCompleta[],
  ) {
    const publicacionesPorId = new Map(
      publicacionesCompletas.map((publicacion) => [publicacion._id.toString(), publicacion]),
    );
    const items: PublicacionParaElFeed[] = [];

    for (const ordenada of publicacionesOrdenadas) {
      const publicacion = publicacionesPorId.get(ordenada._id.toString());

      if (!publicacion) {
        continue;
      }

      const autor = publicacion.autorId as AutorDePublicacion | null;
      let datosAutor: PublicacionParaElFeed['autor'] = null;

      if (autor) {
        datosAutor = {
          id: autor._id.toString(),
          nombre: autor.nombre,
          apellido: autor.apellido,
          nombreUsuario: autor.nombreUsuario,
          imagenPerfilUrl: autor.imagenPerfilUrl,
        };
      }

      items.push({
        id: publicacion._id.toString(),
        titulo: publicacion.titulo,
        descripcion: publicacion.descripcion,
        imagenUrl: publicacion.imagenUrl,
        createdAt: publicacion.createdAt,
        likes: ordenada.likes,
        comentarios: ordenada.comentarios,
        autor: datosAutor,
      });
    }

    return items;
  }

  // Respuesta para cuando el filtro de usuario no encuentra coincidencias.
  private crearRespuestaVacia(pagina: number, cantidad: number) {
    return { items: [], pagina, cantidad, total: 0, paginasTotales: 0 };
  }

  // Busca una página de comentarios, empezando por los más recientes.
  async listarComentarios(publicacionId: string, pagina: number, cantidad: number) {
    const idPublicacion = this.toPublicationObjectId(publicacionId);
    const publicacionExiste = await this.publicacionModel.exists({
      _id: idPublicacion,
      eliminadaEn: null,
    });

    if (!publicacionExiste) {
      throw new NotFoundException('No se encontró la publicación.');
    }

    const filtro = { publicacionId: idPublicacion, eliminadaEn: null };
    const desplazamiento = (pagina - 1) * cantidad;
    const [comentarios, total] = await Promise.all([
      this.comentarioModel
        .find(filtro)
        .sort({ createdAt: -1, _id: -1 })
        .skip(desplazamiento)
        .limit(cantidad)
        .populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl')
        .lean(),
      this.comentarioModel.countDocuments(filtro),
    ]);

    const items = comentarios.map((comment) => {
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
        modificado: comment.modificado,
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

    return {
      items,
      pagina,
      cantidad,
      total,
      paginasTotales: Math.ceil(total / cantidad),
    };
  }

  // Crea un comentario y lo devuelve junto con los datos de quien lo escribió.
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
      modificado: comment.modificado,
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

  // Edita únicamente un comentario activo escrito por el usuario de la sesión.
  async editarComentario(usuarioId: string, comentarioId: string, dto: CreateComentarioDto) {
    if (!Types.ObjectId.isValid(comentarioId)) {
      throw new BadRequestException('El comentario indicado no es válido.');
    }

    const comentario = await this.comentarioModel.findOneAndUpdate(
      { _id: new Types.ObjectId(comentarioId), autorId: new Types.ObjectId(usuarioId), eliminadaEn: null },
      { $set: { mensaje: dto.mensaje.trim(), modificado: true } },
      { new: true },
    ).populate('autorId', 'nombre apellido nombreUsuario imagenPerfilUrl');

    if (!comentario) {
      throw new NotFoundException('No se encontró un comentario propio para editar.');
    }

    const autor = comentario.autorId as unknown as {
      _id: Types.ObjectId;
      nombre: string;
      apellido: string;
      nombreUsuario: string;
      imagenPerfilUrl: string;
    };

    return {
      id: comentario._id.toString(),
      mensaje: comentario.mensaje,
      createdAt: comentario.createdAt,
      modificado: comentario.modificado,
      autor: {
        id: autor._id.toString(),
        nombre: autor.nombre,
        apellido: autor.apellido,
        nombreUsuario: autor.nombreUsuario,
        imagenPerfilUrl: autor.imagenPerfilUrl,
      },
    };
  }

  // Busca los Me gusta activos del usuario y devuelve los IDs de las publicaciones.
  async findMyLikes(usuarioId: string) {
    const likes = await this.meGustaModel
      .find({ usuarioId: new Types.ObjectId(usuarioId), eliminadaEn: null })
      .select('publicacionId')
      .lean();
    return { publicacionIds: likes.map((like) => like.publicacionId.toString()) };
  }

  // Agrega un Me gusta o reactiva uno que el usuario había quitado antes.
  async addLike(usuarioId: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicacionObjectId = new Types.ObjectId(publicationId);
    const publicacion = await this.publicacionModel.findOne({ _id: publicacionObjectId, eliminadaEn: null }).select('_id');
    if (!publicacion) throw new NotFoundException('No se encontró la publicación.');

    const usuarioObjectId = new Types.ObjectId(usuarioId);
    try {
      // upsert crea el like si no existe o actualiza el que ya estaba guardado.
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

  // Quita un Me gusta con baja lógica y devuelve el nuevo total.
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

  // Elimina una publicación propia mediante baja lógica.
  async deleteOwn(usuarioId: string, perfil: string, publicationId: string) {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }

    const publicationObjectId = new Types.ObjectId(publicationId);
    const publication = await this.publicacionModel.findById(publicationObjectId).select('autorId eliminadaEn imagenPublicId');
    if (!publication || publication.eliminadaEn) throw new NotFoundException('No se encontró la publicación.');

    const esAdministrador = perfil === 'administrador';
    const esPropia = publication.autorId.toString() === usuarioId;
    if (!esPropia && !esAdministrador) {
      throw new ForbiddenException('Solo podés eliminar tus propias publicaciones.');
    }

    // El administrador puede eliminar cualquiera; el usuario solo sus publicaciones.
    const filtroAutor = esAdministrador ? {} : { autorId: new Types.ObjectId(usuarioId) };
    const deleted = await this.publicacionModel.findOneAndUpdate(
      { _id: publicationObjectId, ...filtroAutor, eliminadaEn: null },
      { $set: { eliminadaEn: new Date() } },
      { new: true },
    ).select('_id');
    if (!deleted) throw new NotFoundException('La publicación ya no existe.');

    return { message: 'Publicación eliminada.' };
  }

  // Crea una publicación y, si recibió una imagen, primero la guarda en Cloudinary.
  async create(usuarioId: string, dto: CreatePublicacionDto, image?: { buffer: Buffer; mimetype: string }) {
    const usuario = await this.usuarioModel.findById(usuarioId).select('nombre apellido nombreUsuario imagenPerfilUrl');
    if (!usuario) throw new NotFoundException('No se encontró el usuario de la sesión.');

    // La imagen es opcional; si no llega, se usa la URL recibida o una cadena vacía.
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
      // Si MongoDB falla después de subir la imagen, elimina el archivo para no dejarlo suelto.
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

  // Convierte el ID de texto al formato de MongoDB y avisa si no es válido.
  private toPublicationObjectId(publicationId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(publicationId)) {
      throw new BadRequestException('La publicación indicada no es válida.');
    }
    return new Types.ObjectId(publicationId);
  }
}
