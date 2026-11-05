import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { HydratedDocument, Model } from 'mongoose';
import { PerfilUsuario, Usuario } from '../database/schemas/usuario.schema.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async register(dto: RegisterDto, image?: { buffer: Buffer; mimetype: string }) {
    if (dto.password !== dto.repetirPassword) {
      throw new BadRequestException('La contraseña y su repetición no coinciden.');
    }

    const correo = dto.correo.trim().toLowerCase();
    const nombreUsuario = dto.nombreUsuario.trim().toLowerCase();
    const existingUser = await this.usuarioModel.findOne({
      $or: [{ correo }, { nombreUsuario }],
    });

    if (existingUser) {
      throw new ConflictException('Ese correo o nombre de usuario ya está registrado.');
    }

    let uploadedImage: { url: string; publicId: string } | undefined;
    try {
      let imagenPerfilUrl = '';
      if (image) {
        uploadedImage = await this.cloudinaryService.uploadImage(image.buffer, 'lobby/perfiles');
        imagenPerfilUrl = uploadedImage.url;
      }

      const usuario = await this.usuarioModel.create({
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        correo,
        nombreUsuario,
        passwordHash: await hash(dto.password, 12),
        fechaNacimiento: new Date(dto.fechaNacimiento),
        perfil: PerfilUsuario.USUARIO,
        descripcion: dto.descripcion?.trim() ?? '',
        imagenPerfilUrl,
        imagenPerfilPublicId: uploadedImage?.publicId ?? '',
      });

      return this.createSession(usuario);
    } catch (error) {
      if (uploadedImage) await this.cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => undefined);
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Ese correo o nombre de usuario ya está registrado.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const identificador = dto.identificador.trim().toLowerCase();
    const usuario = await this.usuarioModel
      .findOne({ $or: [{ correo: identificador }, { nombreUsuario: identificador }] })
      .select('+passwordHash');

    if (!usuario || !usuario.habilitado || !(await compare(dto.password, usuario.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    return this.createSession(usuario);
  }

  private createSession(usuario: HydratedDocument<Usuario>) {
    const payload = {
      sub: usuario._id.toString(),
      correo: usuario.correo,
      perfil: usuario.perfil,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: payload.sub,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        nombreUsuario: usuario.nombreUsuario,
        perfil: usuario.perfil,
      },
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }
}
