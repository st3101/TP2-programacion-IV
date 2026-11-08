import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Comentario, ComentarioSchema } from '../database/schemas/comentario.schema';
import { Publicacion, PublicacionSchema } from '../database/schemas/publicacion.schema';
import { Usuario, UsuarioSchema } from '../database/schemas/usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

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
