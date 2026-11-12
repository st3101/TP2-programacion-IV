import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly isRegister = this.route.snapshot.data['mode'] === 'register';
  protected readonly passwordVisible = signal(false);
  protected readonly message = signal('');
  protected readonly submitting = signal(false);
  protected readonly selectedImage = signal('');

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected onImageSelected(event: Event): void {
    const input = event.target;
    this.selectedImage.set(input instanceof HTMLInputElement ? input.files?.[0]?.name ?? '' : '');
  }

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement)) return;

    const formData = new FormData(event.target);
    const password = String(formData.get('password') ?? '');
    if (this.isRegister && password !== String(formData.get('repetirPassword') ?? '')) {
      this.message.set('La contraseña y su repetición no coinciden.');
      return;
    }

    const passwordRule = /^(?=.*\p{Lu})(?=.*\d).{8,72}$/u;
    if (!passwordRule.test(password)) {
      this.message.set('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.');
      return;
    }

    const fileValue = formData.get('imagenPerfil');
    const image = fileValue instanceof File && fileValue.size > 0 ? fileValue : undefined;
    if (image && !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      this.message.set('La foto debe estar en formato JPG, PNG o WEBP.');
      return;
    }
    // El navegador informa el tamaño del archivo en bytes; 25 MB son 25 × 1024 × 1024 bytes.
    if (image && image.size > 25 * 1024 * 1024) {
      this.message.set('La foto debe pesar 25 MB o menos.');
      return;
    }

    this.message.set('');
    this.submitting.set(true);

    const request = this.isRegister
      ? this.authService.register({
          nombre: String(formData.get('nombre') ?? ''),
          apellido: String(formData.get('apellido') ?? ''),
          correo: String(formData.get('email') ?? ''),
          nombreUsuario: String(formData.get('username') ?? ''),
          password,
          repetirPassword: String(formData.get('repetirPassword') ?? ''),
          fechaNacimiento: String(formData.get('birthdate') ?? ''),
          descripcion: String(formData.get('descripcion') ?? ''),
        }, image)
      : this.authService.login(
          String(formData.get('identificador') ?? ''),
          password,
        );

    request.subscribe({
      next: () => this.router.navigateByUrl('/feed'),
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.message;
        const serverMessage = typeof detail === 'string' ? detail : '';
        const esAvisoDeDatoDuplicado = /correo|nombre de usuario/i.test(serverMessage)
          && /ocupad|registrad|ya existe/i.test(serverMessage);

        if (!this.isRegister && esAvisoDeDatoDuplicado) {
          this.message.set('No se pudo iniciar sesión. Revisá tus datos e intentá de nuevo.');
          this.submitting.set(false);
          return;
        }

        this.message.set(
          Array.isArray(detail)
            ? detail.join(' ')
            : serverMessage
              ? serverMessage
              : 'No se pudo conectar con el servidor. Revisá que el backend esté iniciado.',
        );
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }
}
