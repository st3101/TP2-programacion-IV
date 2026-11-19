import { Body, Controller, Get, Patch, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { createImageFileInterceptor } from '../interceptors/image-file.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

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

  @Get()
  @UseGuards(AdminGuard)
  listarUsuarios() {
    return this.usuariosService.listarUsuarios();
  }
}
