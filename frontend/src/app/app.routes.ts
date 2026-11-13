import { Routes } from '@angular/router';
import { FeedPageComponent } from './pages/feed/feed-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { RegisterPageComponent } from './pages/register/register-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'registro', component: RegisterPageComponent },
  { path: 'feed', component: FeedPageComponent, canActivate: [authGuard] },
  { path: 'mi-perfil', component: ProfilePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'feed' },
];
