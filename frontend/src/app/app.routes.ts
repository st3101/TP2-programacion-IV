import { Routes } from '@angular/router';
import { FeedPageComponent } from './pages/feed/feed-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'feed' },
  { path: 'feed', component: FeedPageComponent },
  { path: '**', redirectTo: 'feed' },
];
