import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  // Diagnóstico temporal: se desactivan los módulos que dependen de MongoDB.
  // Para restaurar la aplicación, volver a habilitar ConfigModule, MongooseModule,
  // AuthModule, UsuariosModule y PublicacionesModule.
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
