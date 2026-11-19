import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { API_BASE_URL } from '../../api-base-url';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FechaLobbyPipe } from '../../shared/pipes/fecha-lobby.pipe';
import { NombrePropioPipe } from '../../shared/pipes/nombre-propio.pipe';

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
  imports: [FechaLobbyPipe, NombrePropioPipe, NavbarComponent],
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
  protected readonly erroresFormulario = signal<Record<string, string>>({});
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

    const errores: Record<string, string> = {};
    const campos = ['nombre', 'apellido', 'correo', 'nombreUsuario', 'fechaNacimiento', 'descripcion', 'password', 'repetirPassword'];
    for (const nombre of campos) {
      const campo = formulario.elements.namedItem(nombre);
      if (campo instanceof HTMLInputElement) {
        const error = this.validarValor(nombre, campo.value, formulario);
        if (error) {
          errores[nombre] = error;
        }
      }
    }
    this.erroresFormulario.set(errores);
    if (Object.keys(errores).length > 0) {
      this.mensajeCreacion.set('Corregí los campos marcados antes de crear el usuario.');
      return;
    }

    const datos = new FormData(formulario);
    const imagen = datos.get('imagenPerfil');
    if (imagen instanceof File) {
      if (!imagen.name) {
        datos.delete('imagenPerfil');
      } else if (!['image/jpeg', 'image/png', 'image/webp'].includes(imagen.type)) {
        this.erroresFormulario.update((actuales) => ({ ...actuales, imagenPerfil: 'La imagen debe ser JPG, PNG o WEBP.' }));
        this.mensajeCreacion.set('Corregí la imagen antes de crear el usuario.');
        return;
      } else if (imagen.size > 25 * 1024 * 1024) {
        this.erroresFormulario.update((actuales) => ({ ...actuales, imagenPerfil: 'La imagen debe pesar 25 MB o menos.' }));
        this.mensajeCreacion.set('Corregí la imagen antes de crear el usuario.');
        return;
      }
    }

    this.creandoUsuario.set(true);
    this.mensajeCreacion.set('');
    this.http.post(`${API_BASE_URL}/api/usuarios`, datos).subscribe({
      next: () => {
        this.mensajeCreacion.set('Usuario creado correctamente.');
        this.erroresFormulario.set({});
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

  protected validarCampo(event: Event, alSalir = false): void {
    const campo = event.target;
    if (!(campo instanceof HTMLInputElement)) {
      return;
    }

    const error = this.validarValor(campo.name, campo.value, campo.form);
    if (error && (alSalir || campo.value.trim() || this.erroresFormulario()[campo.name])) {
      this.erroresFormulario.update((actuales) => ({ ...actuales, [campo.name]: error }));
    } else {
      this.erroresFormulario.update((actuales) => {
        const nuevos = { ...actuales };
        delete nuevos[campo.name];
        return nuevos;
      });
    }

    if (campo.name === 'password' && campo.form) {
      const repetirPassword = campo.form.elements.namedItem('repetirPassword');
      if (repetirPassword instanceof HTMLInputElement && repetirPassword.value) {
        const error = this.validarValor('repetirPassword', repetirPassword.value, campo.form);
        this.erroresFormulario.update((actuales) => ({
          ...actuales,
          repetirPassword: error,
        }));
      }
    }
  }

  protected validarImagen(event: Event): void {
    const campo = event.target;
    if (!(campo instanceof HTMLInputElement) || !campo.files?.length) {
      this.erroresFormulario.update((actuales) => {
        const nuevos = { ...actuales };
        delete nuevos['imagenPerfil'];
        return nuevos;
      });
      return;
    }

    const imagen = campo.files[0];
    let error = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(imagen.type)) {
      error = 'La imagen debe ser JPG, PNG o WEBP.';
    } else if (imagen.size > 25 * 1024 * 1024) {
      error = 'La imagen debe pesar 25 MB o menos.';
    }

    this.erroresFormulario.update((actuales) => ({
      ...actuales,
      imagenPerfil: error,
    }));
  }

  protected errorDeCampo(nombre: string): string {
    return this.erroresFormulario()[nombre] ?? '';
  }

  private validarValor(nombre: string, valor: string, formulario: HTMLFormElement | null): string {
    const texto = valor.trim();
    if (['nombre', 'apellido', 'correo', 'nombreUsuario', 'fechaNacimiento', 'password', 'repetirPassword'].includes(nombre) && !texto) {
      return 'Este campo es obligatorio.';
    }
    if (nombre === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)) {
      return 'Ingresá un correo válido, por ejemplo nombre@ejemplo.com.';
    }
    if (nombre === 'nombreUsuario' && (texto.length < 3 || texto.length > 30)) {
      return 'El nombre de usuario debe tener entre 3 y 30 caracteres.';
    }
    if (nombre === 'fechaNacimiento' && texto && new Date(`${texto}T00:00:00`) > new Date()) {
      return 'La fecha de nacimiento no puede ser futura.';
    }
    if (nombre === 'password' && !/^(?=.*\p{Lu})(?=.*\d).{8,72}$/u.test(valor)) {
      return 'Usá al menos 8 caracteres, una mayúscula y un número.';
    }
    if (nombre === 'repetirPassword' && formulario) {
      const password = formulario.elements.namedItem('password');
      if (password instanceof HTMLInputElement && valor !== password.value) {
        return 'Las contraseñas no coinciden.';
      }
    }
    if (nombre === 'descripcion' && valor.length > 280) {
      return 'La descripción puede tener hasta 280 caracteres.';
    }
    return '';
  }

  protected cambiarEstado(usuario: AdminUser): void {
    if (this.usuarioActualizando()) {
      return;
    }

    const habilitado = !usuario.habilitado;
    this.usuarioActualizando.set(usuario.id);
    this.mensajeEstado.set('');

    let solicitud: Observable<unknown>;
    if (habilitado) {
      solicitud = this.http.post(`${API_BASE_URL}/api/usuarios/${usuario.id}/rehabilitar`, {});
    } else {
      solicitud = this.http.delete(`${API_BASE_URL}/api/usuarios/${usuario.id}`);
    }

    solicitud.subscribe({
      next: () => {
        this.usuarios.update((usuarios) => usuarios.map((actual) => {
          if (actual.id !== usuario.id) {
            return actual;
          }

          return { ...actual, habilitado };
        }));
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
