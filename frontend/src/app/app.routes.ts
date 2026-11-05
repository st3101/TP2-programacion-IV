import { Routes } from '@angular/router';
import { FeedPageComponent } from './pages/feed/feed-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent, data: { mode: 'login' } },
  { path: 'registro', component: LoginPageComponent, data: { mode: 'register' } },
  { path: 'feed', component: FeedPageComponent },
  { path: 'mi-perfil', component: ProfilePageComponent },
  { path: '**', redirectTo: 'feed' },
];
