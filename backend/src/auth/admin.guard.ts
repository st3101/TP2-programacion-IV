import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {

  //verifica si el usuario tiene perfil de administrador, si no lo tiene lanza un ForbiddenException
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user.perfil !== 'administrador') {
      throw new ForbiddenException('Esta sección es solo para administradores.');
    }
    return true;
  }
}
