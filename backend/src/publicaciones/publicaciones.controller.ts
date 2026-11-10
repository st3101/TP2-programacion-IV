import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { ListPublicacionesQueryDto } from './dto/list-publicaciones-query.dto';
import { PublicacionesService } from './publicaciones.service';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Get()
  findAll(@Query() query: ListPublicacionesQueryDto) {
    return this.publicacionesService.findAll(query.page, query.limit);
  }

  @Get('me-gustas')
  @UseGuards(JwtAuthGuard)
  findMyLikes(@Req() request: AuthenticatedRequest) {
    return this.publicacionesService.findMyLikes(request.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: 25 * 1024 * 1024 },
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

  @Post(':id/me-gusta')
  @UseGuards(JwtAuthGuard)
  toggleLike(@Param('id') publicationId: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.toggleLike(request.user.sub, publicationId);
  }
}
