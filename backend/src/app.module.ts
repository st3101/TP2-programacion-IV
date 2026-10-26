import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './database/schemas/usuario.schema.js';
import { Publicacion, PublicacionSchema } from './database/schemas/publicacion.schema.js';
import { Comentario, ComentarioSchema } from './database/schemas/comentario.schema.js';
import { MeGusta, MeGustaSchema } from './database/schemas/me-gusta.schema.js';
import { Guardado, GuardadoSchema } from './database/schemas/guardado.schema.js';
import { Compartido, CompartidoSchema } from './database/schemas/compartido.schema.js';
import { Ingreso, IngresoSchema } from './database/schemas/ingreso.schema.js';
import { VisitaPerfil, VisitaPerfilSchema } from './database/schemas/visita-perfil.schema.js';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('Falta configurar MONGODB_URI en backend/.env');
}

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri),
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
      { name: MeGusta.name, schema: MeGustaSchema },
      { name: Guardado.name, schema: GuardadoSchema },
      { name: Compartido.name, schema: CompartidoSchema },
      { name: Ingreso.name, schema: IngresoSchema },
      { name: VisitaPerfil.name, schema: VisitaPerfilSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
