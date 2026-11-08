import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Comentario, ComentarioSchema } from '../database/schemas/comentario.schema';
import { MeGusta, MeGustaSchema } from '../database/schemas/me-gusta.schema';
import { Publicacion, PublicacionSchema } from '../database/schemas/publicacion.schema';
import { Usuario, UsuarioSchema } from '../database/schemas/usuario.schema';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

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
