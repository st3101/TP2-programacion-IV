import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProfileService } from './profile.service';

export const adminGuard: CanActivateFn = () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  return profileService.getMyProfile().pipe(
    map((respuesta) => {
      if (respuesta.usuario.perfil === 'administrador') {
        return true;
      }
      return router.createUrlTree(['/feed']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
