import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login-page.component').then((modulo) => modulo.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/register/register-page.component').then((modulo) => modulo.RegisterPageComponent),
  },
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/feed/feed-page.component').then((modulo) => modulo.FeedPageComponent),
  },
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile-page.component').then((modulo) => modulo.ProfilePageComponent),
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-page.component').then((modulo) => modulo.AdminPageComponent),
  },
  {
    path: 'admin/estadisticas',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin-statistics/admin-statistics-page.component').then((modulo) => modulo.AdminStatisticsPageComponent),
  },
  { path: '**', redirectTo: 'login' },
];
