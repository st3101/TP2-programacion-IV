import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  protected readonly mensajeCreacion = signal('');
  protected readonly creandoUsuario = signal(false);
  protected readonly usuarioActualizando = signal('');
  protected readonly mensajeEstado = signal('');

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    this.cargando.set(true);
    this.http.get<AdminUser[]>(`${API_BASE_URL}/api/usuarios`).subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: () => {
        this.error.set('No se pudo cargar la lista de usuarios.');
        this.cargando.set(false);
      },
      complete: () => this.cargando.set(false),
    });
  }

  protected crearUsuario(event: Event): void {
    event.preventDefault();
    const formulario = event.target;
    if (!(formulario instanceof HTMLFormElement) || this.creandoUsuario()) {
      return;
    }

    const datos = new FormData(formulario);
    const imagen = datos.get('imagenPerfil');
    if (imagen instanceof File) {
      if (!imagen.name) {
        datos.delete('imagenPerfil');
      } else if (!['image/jpeg', 'image/png', 'image/webp'].includes(imagen.type)) {
        this.mensajeCreacion.set('La imagen debe ser JPG, PNG o WEBP.');
        return;
      } else if (imagen.size > 25 * 1024 * 1024) {
        this.mensajeCreacion.set('La imagen debe pesar 25 MB o menos.');
        return;
      }
    }

    this.creandoUsuario.set(true);
    this.mensajeCreacion.set('');
    this.http.post(`${API_BASE_URL}/api/usuarios`, datos).subscribe({
      next: () => {
        this.mensajeCreacion.set('Usuario creado correctamente.');
        formulario.reset();
        this.cargarUsuarios();
        this.creandoUsuario.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const detalle = error.error?.message;
        if (Array.isArray(detalle)) {
          this.mensajeCreacion.set(detalle.join(' '));
        } else if (typeof detalle === 'string') {
          this.mensajeCreacion.set(detalle);
        } else {
          this.mensajeCreacion.set('No se pudo crear el usuario. Intentá de nuevo.');
        }
        this.creandoUsuario.set(false);
      },
    });
  }

  protected cambiarEstado(usuario: AdminUser): void {
    if (this.usuarioActualizando()) {
      return;
    }

    const habilitado = !usuario.habilitado;
    this.usuarioActualizando.set(usuario.id);
    this.mensajeEstado.set('');

    this.http.patch<AdminUser>(
      `${API_BASE_URL}/api/usuarios/${usuario.id}/habilitacion`,
      { habilitado },
    ).subscribe({
      next: (usuarioActualizado) => {
        this.usuarios.update((usuarios) => usuarios.map((actual) =>
          actual.id === usuarioActualizado.id ? usuarioActualizado : actual,
        ));
        this.mensajeEstado.set(habilitado ? 'Usuario habilitado.' : 'Usuario deshabilitado.');
        this.usuarioActualizando.set('');
      },
      error: (error: HttpErrorResponse) => {
        const mensaje = error.error?.message;
        if (typeof mensaje === 'string') {
          this.mensajeEstado.set(mensaje);
        } else {
          this.mensajeEstado.set('No se pudo cambiar el estado del usuario.');
        }
        this.usuarioActualizando.set('');
      },
    });
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
