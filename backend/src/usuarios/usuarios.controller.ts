import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { createImageFileInterceptor } from '../interceptors/image-file.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UsuariosService } from './usuarios.service';
import { AuthService } from '../auth/auth.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  getMyProfile(@Req() request: AuthenticatedRequest) {
    return this.usuariosService.getMyProfile(request.user.sub);
  }

  @Patch('me')
  @UseInterceptors(
    createImageFileInterceptor('imagenPerfil', 'La foto debe ser JPG, PNG o WEBP.'),
  )
  updateMyProfile(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
  ) {
    return this.usuariosService.updateMyProfile(request.user.sub, updateProfileDto, image);
  }

  // Sólo los administradores pueden listar todos los usuarios y ver estadísticas
  @Get()
  @UseGuards(AdminGuard)
  listarUsuarios() {
    return this.usuariosService.listarUsuarios();
  }

  @Get('estadisticas/publicaciones')
  @UseGuards(AdminGuard)
  estadisticasDePublicaciones(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!desde || !hasta) {
      throw new BadRequestException('Elegí una fecha de inicio y una fecha de fin.');
    }
    return this.usuariosService.estadisticasDePublicaciones(desde, hasta);
  }

  @Get('estadisticas/comentarios')
  @UseGuards(AdminGuard)
  estadisticasDeComentarios(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!desde || !hasta) {
      throw new BadRequestException('Elegí una fecha de inicio y una fecha de fin.');
    }
    return this.usuariosService.estadisticasDeComentarios(desde, hasta);
  }

  @Get('estadisticas/comentarios-por-publicacion')
  @UseGuards(AdminGuard)
  estadisticasDeComentariosPorPublicacion(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!desde || !hasta) {
      throw new BadRequestException('Elegí una fecha de inicio y una fecha de fin.');
    }
    return this.usuariosService.estadisticasDeComentariosPorPublicacion(desde, hasta);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(
    createImageFileInterceptor('imagenPerfil', 'La foto debe ser JPG, PNG o WEBP.'),
  )
  crearUsuario(
    @Body() datos: AdminCreateUserDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
  ) {
    return this.authService.crearUsuarioAdministrador(datos, image, datos.perfil);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  deshabilitarUsuario(
    @Param('id') usuarioId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usuariosService.cambiarHabilitacion(usuarioId, false, request.user.sub);
  }

  @Post(':id/rehabilitar')
  @UseGuards(AdminGuard)
  rehabilitarUsuario(
    @Param('id') usuarioId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usuariosService.cambiarHabilitacion(usuarioId, true, request.user.sub);
  }
}
