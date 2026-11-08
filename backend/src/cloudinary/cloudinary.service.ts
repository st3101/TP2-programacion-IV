import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImage(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
    this.configure();
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream({ folder }, (error, response) => {
        if (error) {
          reject(error);
        } else if (!response) {
          reject(new Error('Cloudinary no devolvió información de la imagen.'));
        } else {
          resolve(response);
        }
      });
      Readable.from(buffer).pipe(upload);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    this.configure();
    await cloudinary.uploader.destroy(publicId);
  }

  private configure(): void {
    const connectionUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (connectionUrl) {
      const parsed = new URL(connectionUrl);
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: decodeURIComponent(parsed.username),
        api_secret: decodeURIComponent(parsed.password),
        secure: true,
      });
      return;
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      return;
    }

    throw new ServiceUnavailableException('La carga de imágenes no está configurada.');
  }
}
