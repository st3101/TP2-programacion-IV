import { BadRequestException, Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { PublicacionesService } from './publicaciones.service';

@Controller('publicaciones')
@UseGuards(JwtAuthGuard)
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Get()
  findAll() {
    return this.publicacionesService.findAll();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          callback(new BadRequestException('La imagen debe ser JPG, PNG o WEBP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePublicacionDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
  ) {
    return this.publicacionesService.create(request.user.sub, dto, image);
  }
}
