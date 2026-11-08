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
  const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (
    request.method === 'GET' &&
    (requestPath === '/' || requestPath === '/api' || requestPath === '/api/')
  ) {
    response.status(200).json({ message: '¡Funciona!' });
    return;
  }

  const nestApp = await getApp();
  nestApp.getHttpAdapter().getInstance()(request, response);
}
