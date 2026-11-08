import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

export function configureApp(app: NestExpressApplication): NestExpressApplication {
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({ origin: true, credentials: true });
  return app;
}

export async function createApp(): Promise<NestExpressApplication> {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  await app.init();
  return app;
}
