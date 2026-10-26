import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Publicacion } from './publicacion.schema.js';
import { Usuario } from './usuario.schema.js';

export type MeGustaDocument = HydratedDocument<MeGusta>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'me_gusta' })
export class MeGusta {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Publicacion.name, required: true })
  publicacionId!: Types.ObjectId;
}

export const MeGustaSchema = SchemaFactory.createForClass(MeGusta);
MeGustaSchema.index({ usuarioId: 1, publicacionId: 1 }, { unique: true });
MeGustaSchema.index({ publicacionId: 1, createdAt: -1 });
