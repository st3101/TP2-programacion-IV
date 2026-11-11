import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function createImageFileInterceptor(fieldName: string, errorMessage: string) {
  return FileInterceptor(fieldName, {
    // Límite de 25 MB expresado en bytes.
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        callback(new BadRequestException(errorMessage), false);
        return;
      }
      callback(null, true);
    },
  });
}
