import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly authService = inject(AuthService);

  protected extenderSesion(): void {
    void firstValueFrom(this.authService.extenderSesion()).catch(() => {
      this.authService.manejarSesionNoValida();
    });
  }

  protected finalizarSesion(): void {
    this.authService.cerrarModalAvisoSesion();
  }

  protected textoRelojSesion(): string {
    const segundos = this.authService.segundosRestantesSesion() ?? 0;
    const minutos = Math.floor(segundos / 60).toString().padStart(2, '0');
    const segundosRestantes = (segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${segundosRestantes}`;
  }
}
