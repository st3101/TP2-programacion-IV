import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { API_BASE_URL } from '../../api-base-url';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface AdminUser {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  perfil: string;
  habilitado: boolean;
  creadoEn: string;
}

@Component({
  selector: 'app-admin-page',
  imports: [DatePipe, NavbarComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css',
})
export class AdminPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly usuarios = signal<AdminUser[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.http.get<AdminUser[]>(`${API_BASE_URL}/api/usuarios`).subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: () => {
        this.error.set('No se pudo cargar la lista de usuarios.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false),
    });
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
