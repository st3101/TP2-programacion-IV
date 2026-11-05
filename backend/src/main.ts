import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:4200',
    credentials: true,
  });
  await app.listen(Number(configService.get<string>('PORT') ?? 3000));
}
await bootstrap();
