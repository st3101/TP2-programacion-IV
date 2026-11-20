import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { HydratedDocument, Model } from 'mongoose';
import { PerfilUsuario, Usuario } from '../database/schemas/usuario.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async register(dto: RegisterDto, image?: { buffer: Buffer; mimetype: string }) {
    const usuario = await this.crearUsuario(dto, image, PerfilUsuario.USUARIO);
    return this.createSession(usuario);
  }

  async crearUsuarioAdministrador(
    dto: RegisterDto,
    image: { buffer: Buffer; mimetype: string } | undefined,
    perfil: PerfilUsuario,
  ) {
    const usuario = await this.crearUsuario(dto, image, perfil);
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
      habilitado: usuario.habilitado,
    };
  }

  private async crearUsuario(
    dto: RegisterDto,
    image: { buffer: Buffer; mimetype: string } | undefined,
    perfil: PerfilUsuario,
  ): Promise<HydratedDocument<Usuario>> {
    if (dto.password !== dto.repetirPassword) {
      throw new BadRequestException('La contraseña y su repetición no coinciden.');
    }

    const correo = dto.correo.trim().toLowerCase();
    const nombreUsuario = dto.nombreUsuario.trim().toLowerCase();
    const [correoOcupado, nombreUsuarioOcupado] = await Promise.all([
      this.usuarioModel.exists({ correo }),
      this.usuarioModel.exists({ nombreUsuario }),
    ]);

    if (correoOcupado || nombreUsuarioOcupado) {
      throw new ConflictException(
        this.registrationConflictMessage(Boolean(correoOcupado), Boolean(nombreUsuarioOcupado)),
      );
    }

    let uploadedImage: { url: string; publicId: string } | undefined;
    try {
      let imagenPerfilUrl = '';
      if (image) {
        uploadedImage = await this.cloudinaryService.uploadImage(image.buffer, 'lobby/perfiles');
        imagenPerfilUrl = uploadedImage.url;
      }

      return await this.usuarioModel.create({
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        correo,
        nombreUsuario,
        passwordHash: await hash(dto.password, 12),
        fechaNacimiento: new Date(dto.fechaNacimiento),
        perfil,
        descripcion: dto.descripcion?.trim() ?? '',
        imagenPerfilUrl,
        imagenPerfilPublicId: uploadedImage?.publicId ?? '',
      });

    } catch (error) {
      if (uploadedImage) await this.cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => undefined);
      if (this.isDuplicateKeyError(error)) {
        // El índice único de MongoDB también protege contra dos registros simultáneos.
        const [correoOcupado, nombreUsuarioOcupado] = await Promise.all([
          this.usuarioModel.exists({ correo }),
          this.usuarioModel.exists({ nombreUsuario }),
        ]);
        throw new ConflictException(
          this.registrationConflictMessage(Boolean(correoOcupado), Boolean(nombreUsuarioOcupado)),
        );
      }
      throw error;
    }
  }

  // Busca al usuario y comprueba su contraseña antes de crear la sesión.
  async login(dto: LoginDto) {
    const identificador = dto.identificador.trim().toLowerCase();
    const usuario = await this.usuarioModel     //Busca el usuario en la base de datos por correo o nombre de usuario y selecciona el campo passwordHash
      .findOne({ $or: [{ correo: identificador }, { nombreUsuario: identificador }] })
      .select('+passwordHash');

    if (!usuario || !(await compare(dto.password, usuario.passwordHash))) { //Compara contraseña ingresada con la contraseña encriptada en la base de datos
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (!usuario.habilitado) {
      throw new ForbiddenException('Tu cuenta está deshabilitada. Contactá a un administrador.');
    }

    return this.createSession(usuario);
  }

  async refreshSession(usuarioId: string) {
    const usuario = await this.usuarioModel.findOne({ _id: usuarioId, habilitado: true });
    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }
    return this.createSession(usuario);
  }

  async obtenerUsuarioAutorizado(usuarioId: string) {
    const usuario = await this.usuarioModel
      .findOne({ _id: usuarioId, habilitado: true })
      .select('nombre apellido correo nombreUsuario perfil');

    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    return {
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };
  }

  private createSession(usuario: HydratedDocument<Usuario>) {
    //Crea el payload del token JWT con la información del usuario
    const payload = {
      sub: usuario._id.toString(),
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };

    // devuelve el token JWT y la información del usuario en un objeto
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

  private registrationConflictMessage(correoOcupado: boolean, nombreUsuarioOcupado: boolean): string {
    if (correoOcupado && nombreUsuarioOcupado) {
      return 'El correo y el nombre de usuario ya están ocupados. Elegí otros.';
    }
    if (correoOcupado) return 'Ese correo ya está registrado. Probá con otro.';
    if (nombreUsuarioOcupado) return 'Ese nombre de usuario ya está ocupado. Elegí otro.';
    return 'No se pudo crear la cuenta porque el correo o el nombre de usuario ya están ocupados.';
  }
}
