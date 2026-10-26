import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type VisitaPerfilDocument = HydratedDocument<VisitaPerfil>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'visitas_perfil' })
export class VisitaPerfil {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  visitanteId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  perfilVisitadoId!: Types.ObjectId;
}

export const VisitaPerfilSchema = SchemaFactory.createForClass(VisitaPerfil);
VisitaPerfilSchema.index({ perfilVisitadoId: 1, createdAt: -1 });
