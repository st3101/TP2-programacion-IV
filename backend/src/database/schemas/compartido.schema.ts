import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from './usuario.schema.js';

export type CompartidoDocument = HydratedDocument<Compartido>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'compartidos' })
export class Compartido {
  @Prop({ type: Types.ObjectId, ref: Publicacion.name, required: true })
  publicacionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  compartidoPorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  compartidoConId!: Types.ObjectId;
}

export const CompartidoSchema = SchemaFactory.createForClass(Compartido);
CompartidoSchema.index(
  { publicacionId: 1, compartidoPorId: 1, compartidoConId: 1 },
  { unique: true },
);
CompartidoSchema.index({ compartidoConId: 1, createdAt: -1 });
