import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

// Crea una instancia de la aplicación NestJS y la devuelve. Si ya existe una instancia, devuelve la existente.
async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
// Ejecuta la función bootstrap para iniciar la aplicación
void bootstrap();
