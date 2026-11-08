import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/create-app';

let app: Awaited<ReturnType<typeof createApp>> | undefined;

async function getApp(): Promise<Awaited<ReturnType<typeof createApp>>> {
  if (!app) {
    app = await createApp();
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
