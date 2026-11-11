import { Body, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
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
      maxAge: 30 * 60 * 1000,
    };
  }
}
