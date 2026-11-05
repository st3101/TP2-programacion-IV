import { BadRequestException, Body, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @UseInterceptors(
    FileInterceptor('imagenPerfil', {
      // Límite de 5 MB expresado en bytes.
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          callback(new BadRequestException('La foto debe estar en formato JPG, PNG o WEBP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  register(
    @Body() registerDto: RegisterDto,
    @UploadedFile() image?: { buffer: Buffer; mimetype: string },
    @Res({ passthrough: true }) response?: Response,
  ) {
    return this.createSessionCookie(this.authService.register(registerDto, image), response);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.createSessionCookie(this.authService.login(loginDto), response);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.cookieOptions());
    return { message: 'Sesión cerrada.' };
  }

  private async createSessionCookie(
    sessionPromise: ReturnType<AuthService['login']>,
    response?: Response,
  ) {
    const session = await sessionPromise;
    response?.cookie('access_token', session.accessToken, this.cookieOptions());
    return { usuario: session.usuario };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 3 * 60 * 1000,
    };
  }
}
