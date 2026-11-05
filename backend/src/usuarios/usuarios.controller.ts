import { BadRequestException, Body, Controller, Get, Patch, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios/me')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  getMyProfile(@Req() request: AuthenticatedRequest) {
    return this.usuariosService.getMyProfile(request.user.sub);
  }

  @Patch()
  @UseInterceptors(
    FileInterceptor('imagenPerfil', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          callback(new BadRequestException('La foto debe ser JPG, PNG o WEBP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  updateMyProfile(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
  ) {
    return this.usuariosService.updateMyProfile(request.user.sub, updateProfileDto, image);
  }
}
