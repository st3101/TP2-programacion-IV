import { Body, Controller, Delete, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { createImageFileInterceptor } from '../interceptors/image-file.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { ListPublicacionesQueryDto } from './dto/list-publicaciones-query.dto';
import { PublicacionesService } from './publicaciones.service';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: ListPublicacionesQueryDto) {
    return this.publicacionesService.findAll(
      query.offset,
      query.limit,
      query.orden,
      query.usuarioId,
      query.usuario,
    );
  }

  @Get('me-gustas')
  @UseGuards(JwtAuthGuard)
  findMyLikes(@Req() request: AuthenticatedRequest) {
    return this.publicacionesService.findMyLikes(request.user.sub);
  }

  @Get(':id/comentarios')
  @UseGuards(JwtAuthGuard)
  findComments(@Param('id') publicationId: string) {
    return this.publicacionesService.findComments(publicationId);
  }

  @Post(':id/comentarios')
  @UseGuards(JwtAuthGuard)
  createComment(
    @Param('id') publicationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateComentarioDto,
  ) {
    return this.publicacionesService.createComment(request.user.sub, publicationId, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    createImageFileInterceptor('imagen', 'La imagen debe ser JPG, PNG o WEBP.'),
  )
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePublicacionDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
  ) {
    return this.publicacionesService.create(request.user.sub, dto, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteOwn(@Param('id') publicationId: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.deleteOwn(request.user.sub, publicationId);
  }

  @Post(':id/me-gusta')
  @UseGuards(JwtAuthGuard)
  addLike(@Param('id') publicationId: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.addLike(request.user.sub, publicationId);
  }

  @Delete(':id/me-gusta')
  @UseGuards(JwtAuthGuard)
  removeLike(@Param('id') publicationId: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.removeLike(request.user.sub, publicationId);
  }
}
