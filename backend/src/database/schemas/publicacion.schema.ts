import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type PublicacionDocument = HydratedDocument<Publicacion>;

@Schema({ timestamps: true, collection: 'publicaciones' })
export class Publicacion {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  autorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  titulo!: string;

  @Prop({ required: true, trim: true, maxlength: 10000 })
  descripcion!: string;

  @Prop({ trim: true, default: '' })
  imagenUrl!: string;

  @Prop({ type: Date, default: null })
  eliminadaEn!: Date | null;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
PublicacionSchema.index({ eliminadaEn: 1, createdAt: -1 });
