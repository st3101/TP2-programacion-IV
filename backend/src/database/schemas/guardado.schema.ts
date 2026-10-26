import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from './usuario.schema.js';

export type GuardadoDocument = HydratedDocument<Guardado>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'guardados' })
export class Guardado {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Publicacion.name, required: true })
  publicacionId!: Types.ObjectId;
}

export const GuardadoSchema = SchemaFactory.createForClass(Guardado);
GuardadoSchema.index({ usuarioId: 1, publicacionId: 1 }, { unique: true });
GuardadoSchema.index({ publicacionId: 1, createdAt: -1 });
