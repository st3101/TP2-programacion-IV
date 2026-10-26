import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum RolUsuario {
  USUARIO = 'usuario',
  ADMINISTRADOR = 'administrador',
}

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema({ timestamps: true, collection: 'usuarios' })
export class Usuario {
  @Prop({ required: true, trim: true, maxlength: 80 })
  nombre!: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  apellido!: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  correo!: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  nombreUsuario!: string;

  // Se guarda el hash de la contraseña, nunca la contraseña original.
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, type: Date })
  fechaNacimiento!: Date;

  @Prop({ trim: true, maxlength: 280, default: '' })
  descripcion!: string;

  @Prop({ trim: true, default: '' })
  imagenPerfilUrl!: string;

  @Prop({ type: String, enum: RolUsuario, default: RolUsuario.USUARIO })
  rol!: RolUsuario;

  @Prop({ default: true })
  habilitado!: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
