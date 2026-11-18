import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, maxLength, minLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [FormField, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: '../login/login-page.component.css',
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly passwordVisible = signal(false);
  protected readonly message = signal('');
  protected readonly selectedImage = signal('');
  private readonly selectedFile = signal<File | null>(null);

  // Datos del formulario de registro, con validaciones para cada campo.
  private readonly datosFormulario = signal({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    birthdate: '',
    password: '',
    repetirPassword: '',
    descripcion: '',
  });

  // Formulario de registro, con validaciones para cada campo.
  protected readonly formulario = form(this.datosFormulario, (campos) => {
    required(campos.nombre);
    maxLength(campos.nombre, 80);
    required(campos.apellido);
    maxLength(campos.apellido, 80);
    required(campos.username);
    minLength(campos.username, 3);
    maxLength(campos.username, 30);
    required(campos.email);
    email(campos.email);
    required(campos.birthdate);
    required(campos.password);
    pattern(campos.password, /^(?=.*\p{Lu})(?=.*\d).{8,72}$/u);
    required(campos.repetirPassword);
    maxLength(campos.repetirPassword, 72);
    validate(campos.repetirPassword, ({ value, valueOf }) => {
      // Valida que la contraseña repetida coincida con la contraseña original.
      if (value() !== valueOf(campos.password)) {
        return { kind: 'passwordMismatch', message: 'Las contraseñas no coinciden.' };
      }

      return undefined;
    });
    maxLength(campos.descripcion, 280);
  });

  protected alternarVisibilidadContrasena(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  //Carga de imagen de perfil
  protected seleccionarImagen(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      const image = input.files?.[0] ?? null;
      this.selectedFile.set(image);
      this.selectedImage.set(image?.name ?? '');
    }
  }

  //Envio del formulario de registro al backend, con validaciones de imagen y manejo de errores.
  protected enviarFormulario(event: Event): void {
    event.preventDefault();

    void submit(this.formulario, async () => {
      const datos = this.datosFormulario();
      const image = this.selectedFile() ?? undefined;

      if (image && !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
        this.message.set('La foto debe estar en formato JPG, PNG o WEBP.');
        return;
      }

      // 25 MB expresados en bytes.
      if (image && image.size > 25 * 1024 * 1024) {
        this.message.set('La foto debe pesar 25 MB o menos.');
        return;
      }

      this.message.set('');

      try {
        await firstValueFrom(this.authService.register({
          nombre: datos.nombre,
          apellido: datos.apellido,
          correo: datos.email,
          nombreUsuario: datos.username,
          password: datos.password,
          repetirPassword: datos.repetirPassword,
          fechaNacimiento: datos.birthdate,
          descripcion: datos.descripcion,
        }, image));
        await this.router.navigateByUrl('/feed');
      } catch (error) {
        this.mostrarError(error);
      }
    });
  }

  private mostrarError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.message;
      if (Array.isArray(detail)) {
        this.message.set(detail.join(' '));
        return;
      }

      if (typeof detail === 'string') {
        this.message.set(detail);
        return;
      }
    }

    this.message.set('No se pudo conectar con el servidor. Revisá que el backend esté iniciado.');
  }
}
