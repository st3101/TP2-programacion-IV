import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; correo: string; nombreUsuario: string; perfil: string; iat?: number };
}

const TIEMPO_PARA_EXTENDER_MS = 60 * 1000;

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
      if (request.path.endsWith('/auth/refresh')) {
        const emitidoEn = (request.user.iat ?? 0) * 1000;
        if (!emitidoEn || Date.now() - emitidoEn > TIEMPO_PARA_EXTENDER_MS) {
          throw new UnauthorizedException('El tiempo para extender la sesión terminó.');
        }
      }
      return true;
    } catch {
      throw new UnauthorizedException('El token es inválido o venció.');
    }
  }
}
