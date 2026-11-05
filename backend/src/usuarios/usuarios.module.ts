import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Comentario, ComentarioSchema } from '../database/schemas/comentario.schema.js';
import { Publicacion, PublicacionSchema } from '../database/schemas/publicacion.schema.js';
import { Usuario, UsuarioSchema } from '../database/schemas/usuario.schema.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
    ]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService, JwtAuthGuard],
})
export class UsuariosModule {}
