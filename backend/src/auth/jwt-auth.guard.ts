import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; correo: string; perfil: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, bearerToken] = authorization?.split(' ') ?? [];
    const token = request.cookies?.access_token ?? (scheme === 'Bearer' ? bearerToken : undefined);

    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso.');
    }

    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('El token es inválido o venció.');
    }
  }
}
