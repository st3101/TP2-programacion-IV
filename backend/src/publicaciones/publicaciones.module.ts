import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { Comentario, ComentarioSchema } from '../database/schemas/comentario.schema.js';
import { MeGusta, MeGustaSchema } from '../database/schemas/me-gusta.schema.js';
import { Publicacion, PublicacionSchema } from '../database/schemas/publicacion.schema.js';
import { Usuario, UsuarioSchema } from '../database/schemas/usuario.schema.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Comentario.name, schema: ComentarioSchema },
      { name: MeGusta.name, schema: MeGustaSchema },
    ]),
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
