import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

    this.message.set('');
    this.submitting.set(true);
    this.authService.login(String(formData.get('identificador') ?? ''), password).subscribe({
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
