import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema';
import { Usuario } from './usuario.schema';

export type ComentarioDocument = HydratedDocument<Comentario>;

@Schema({ timestamps: true, collection: 'comentarios' })
export class Comentario {
  declare createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: Publicacion.name, required: true })
  publicacionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  autorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 3000 })
  mensaje!: string;

  @Prop({ default: false })
  modificado!: boolean;

  @Prop({ type: Date, default: null })
  eliminadaEn!: Date | null;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);
ComentarioSchema.index({ publicacionId: 1, createdAt: -1 });
