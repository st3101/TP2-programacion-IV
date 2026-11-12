import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

// Configura la aplicación NestJS con middlewares, prefijos globales y validaciones
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  // Middleware para parsear cookies en las solicitudes
  app.use(cookieParser());
  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });
  // Configura un pipe de validación global para validar y transformar los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Habilita CORS para permitir solicitudes desde cualquier origen y enviar cookies
  app.enableCors({ origin: true, credentials: true });
  return app;
}

// Crea una instancia de la aplicación NestJS y la devuelve. Si ya existe una instancia, devuelve la existente.
export async function createApp(): Promise<NestExpressApplication> {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  await app.init();
  return app;
}
