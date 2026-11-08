import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';

let app: NestExpressApplication | undefined;

async function getApp(): Promise<NestExpressApplication> {
  if (!app) {
    const nestApp = await NestFactory.create<NestExpressApplication>(AppModule);
    await nestApp.init();
    app = nestApp;
  }

  return app;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  const nestApp = await getApp();
  nestApp.getHttpAdapter().getInstance()(request, response);
}
