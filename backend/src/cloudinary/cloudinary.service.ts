import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';

@Injectable()
export class CloudinaryService {

  // Congiguración del servicio de Cloudinary, asegurando que la URL de Cloudinary esté correctamente configurada
  constructor(configService: ConfigService) {
    const cloudinaryUrl = configService.getOrThrow<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl.startsWith('cloudinary://')) {
      throw new Error('CLOUDINARY_URL debe comenzar con cloudinary://.');
    }

    const configuration = cloudinary.config(true);
    if (!configuration.cloud_name || !configuration.api_key || !configuration.api_secret) {
      throw new Error('CLOUDINARY_URL debe incluir cloud name, api key y api secret.');
    }
  }

  // Sube una imagen a Cloudinary y devuelve la URL segura y el ID público de la imagen subida
  uploadImage(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(new ServiceUnavailableException('No se pudo subir la imagen. Intentá de nuevo.'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      Readable.from([buffer]).pipe(upload);
    });
  }

  // Elimina una imagen usando su id 
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}
