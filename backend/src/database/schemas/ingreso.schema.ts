import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type IngresoDocument = HydratedDocument<Ingreso>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'ingresos' })
export class Ingreso {
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true, index: true })
  usuarioId!: Types.ObjectId;
}

export const IngresoSchema = SchemaFactory.createForClass(Ingreso);
IngresoSchema.index({ usuarioId: 1, createdAt: -1 });
