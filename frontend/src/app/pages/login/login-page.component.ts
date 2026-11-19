import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormField, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly passwordVisible = signal(false);
  protected readonly message = signal('');
  protected readonly cargandoSesion = signal(false);
  private readonly datosFormulario = signal({
    identificador: '',
    password: '',
  });
  protected readonly formulario = form(this.datosFormulario, (campos) => {
    required(campos.identificador, { message: 'Ingresá tu nombre de usuario.' });
    required(campos.password, { message: 'Ingresá tu contraseña.' });
    pattern(campos.password, /^(?=.*\p{Lu})(?=.*\d).{8,72}$/u, {
      message: 'La contraseña debe tener 8 caracteres, una mayúscula y un número.',
    });
  });

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    void submit(this.formulario, async () => {
      const { identificador, password } = this.datosFormulario();
      this.message.set('');
      const inicio = Date.now();
      this.cargandoSesion.set(true);

      try {
        await firstValueFrom(this.authService.login(identificador, password));
        await this.esperarSpinner(inicio);
        await this.router.navigateByUrl('/feed');
      } catch (error) {
        await this.esperarSpinner(inicio);
        this.mostrarError(error);
      } finally {
        this.cargandoSesion.set(false);
      }
    });
  }

  private async esperarSpinner(inicio: number): Promise<void> {
    const restante = 1500 - (Date.now() - inicio);
    if (restante > 0) {
      await new Promise((resolver) => setTimeout(resolver, restante));
    }
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
