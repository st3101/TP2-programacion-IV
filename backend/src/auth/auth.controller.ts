import { Body, Controller, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createImageFileInterceptor } from '../interceptors/image-file.interceptor';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @UseInterceptors(
    createImageFileInterceptor(
      'imagenPerfil',
      'La foto debe estar en formato JPG, PNG o WEBP.',
    ),
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

  @Post('autorizar')
  @UseGuards(JwtAuthGuard)
  async autorizar(@Req() request: AuthenticatedRequest) {
    return {
      autorizado: true,
      usuario: await this.authService.obtenerUsuarioAutorizado(request.user.sub),
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refresh(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    return this.createSessionCookie(this.authService.refreshSession(request.user.sub), response);
  }

  // Crea la cookie de sesión y devuelve el usuario
  private async createSessionCookie(
    sessionPromise: ReturnType<AuthService['login']>,
    response?: Response,
  ) {
    const session = await sessionPromise;
    response?.cookie('access_token', session.accessToken, this.cookieOptions());
    return { usuario: session.usuario };
  }

  // Configuración de las cookies de sesión
  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 20 * 60 * 1000,
    };
  }
}
