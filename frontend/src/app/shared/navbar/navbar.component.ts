import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  @Input() currentPage: 'feed' | 'profile' | 'users' | 'statistics' = 'feed';
  @Input() isAdmin = false;
  @Output() logoutRequested = new EventEmitter<void>();
}
