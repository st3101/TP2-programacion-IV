import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: '../login/login-page.component.css',
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly passwordVisible = signal(false);
  protected readonly message = signal('');
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal('');

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected onImageSelected(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.selectedImage.set(input.files?.[0]?.name ?? '');
    }
  }

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement)) {
      return;
    }

    const formData = new FormData(event.target);
    const password = String(formData.get('password') ?? '');
    const repetirPassword = String(formData.get('repetirPassword') ?? '');

    if (password !== repetirPassword) {
      this.message.set('La contraseña y su repetición no coinciden.');
      return;
    }

    const passwordRule = /^(?=.*\p{Lu})(?=.*\d).{8,72}$/u;
    if (!passwordRule.test(password)) {
      this.message.set('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.');
      return;
    }

    const fileValue = formData.get('imagenPerfil');
    let image: File | undefined;
    if (fileValue instanceof File && fileValue.size > 0) {
      image = fileValue;
    }

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
    this.submitting.set(true);

    this.authService.register({
      nombre: String(formData.get('nombre') ?? ''),
      apellido: String(formData.get('apellido') ?? ''),
      correo: String(formData.get('email') ?? ''),
      nombreUsuario: String(formData.get('username') ?? ''),
      password,
      repetirPassword,
      fechaNacimiento: String(formData.get('birthdate') ?? ''),
      descripcion: String(formData.get('descripcion') ?? ''),
    }, image).subscribe({
      next: () => this.router.navigateByUrl('/feed'),
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.message;
        this.message.set(
          Array.isArray(detail)
            ? detail.join(' ')
            : typeof detail === 'string'
              ? detail
              : 'No se pudo conectar con el servidor. Revisá que el backend esté iniciado.',
        );
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }
}
