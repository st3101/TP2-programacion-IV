import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from './usuario.schema.js';

export type ComentarioDocument = HydratedDocument<Comentario>;

@Schema({ timestamps: true, collection: 'comentarios' })
export class Comentario {
  @Prop({ type: Types.ObjectId, ref: Publicacion.name, required: true })
  publicacionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  autorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 3000 })
  mensaje!: string;

  @Prop({ default: false })
  modificado!: boolean;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);
ComentarioSchema.index({ publicacionId: 1, createdAt: -1 });
