import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

const DURACION_CONTADOR_SESION = 10 * 60 * 1000; // 5 minutos de reloj

// Interface que espera desde el backend al iniciar sesión o registrarse, con la informacion del usuario autenticado
export interface AuthResponse {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    correo: string;
    nombreUsuario: string;
    perfil: string;
  };
}

// Interface con los datos definidos que se envia al backend al registrarse
export interface RegisterPayload {
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  password: string;
  repetirPassword: string;
  fechaNacimiento: string;
  descripcion: string;
}

// Permite usar esta clase como servicio inyectable en toda la aplicación
@Injectable({ providedIn: 'root' })

// Clase que maneja la autenticación de usuarios
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${API_BASE_URL}/api/auth`;
  private readonly claveVencimientoSesion = 'lobby_session_expires_at';
  readonly segundosRestantesSesion = signal<number | null>(null);
  private relojSesion?: ReturnType<typeof setInterval>;

  
  constructor() {
    this.iniciarRelojSesion();
  }

  // Peticion de login al backend
  login(identificador: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { identificador, password }).pipe(
      tap(() => this.iniciarRelojSesion(true)),
    );
  }

  // Peticion de registro al backend
  register(payload: RegisterPayload, imagenPerfil?: File): Observable<AuthResponse> {
    const body = new FormData(); // Paquete con datos del usuario + imagen de perfil 
    for (const [key, value] of Object.entries(payload)) body.append(key, value);
    if (imagenPerfil) {
      body.append('imagenPerfil', imagenPerfil);
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, body).pipe(
      tap(() => this.iniciarRelojSesion(true)),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      finalize(() => this.limpiarRelojSesion()),
    );
  }

  validateSession(): Observable<boolean> {
    let venceEn = 0;
    if (typeof localStorage !== 'undefined') {
      venceEn = Number(localStorage.getItem(this.claveVencimientoSesion) ?? 0);
    }
    if (venceEn && venceEn <= Date.now()) {
      this.limpiarRelojSesion();
      return of(false);
    }

    return this.http.get<unknown>(`${API_BASE_URL}/api/usuarios/me`).pipe(
      map(() => {
        if (!venceEn) {
          this.iniciarRelojSesion(true);
        }
        return true;
      }),
      catchError(() => {
        this.limpiarRelojSesion();
        return of(false);
      }),
    );
  }

  private iniciarRelojSesion(nuevaSesion = false): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (this.relojSesion) {
      clearInterval(this.relojSesion);
    }
    this.relojSesion = undefined;

    let venceEn: number;
    if (nuevaSesion) {
      venceEn = Date.now() + DURACION_CONTADOR_SESION;
      localStorage.setItem(this.claveVencimientoSesion, String(venceEn));
    } else {
      venceEn = Number(localStorage.getItem(this.claveVencimientoSesion) ?? 0);
    }

    if (!venceEn) {
      this.segundosRestantesSesion.set(null);
      return;
    }

    if (venceEn <= Date.now()) {
      this.limpiarRelojSesion();
      void this.router.navigateByUrl('/login');
      return;
    }

    const actualizar = (): void => {
      const segundos = Math.ceil((venceEn - Date.now()) / 1000);
      if (segundos <= 0) {
        this.limpiarRelojSesion();
        void this.router.navigateByUrl('/login');
        return;
      }
      this.segundosRestantesSesion.set(segundos);
    };

    actualizar();
    if (this.segundosRestantesSesion() !== null) {
      this.relojSesion = setInterval(actualizar, 1000);
    }
  }

  private limpiarRelojSesion(): void {
    if (this.relojSesion) {
      clearInterval(this.relojSesion);
    }
    this.relojSesion = undefined;
    this.segundosRestantesSesion.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.claveVencimientoSesion);
    }
  }
}
