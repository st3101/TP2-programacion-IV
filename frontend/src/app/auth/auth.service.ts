import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

export const DURACION_CONTADOR_SESION_MS = 10 * 60 * 1000;
export const GRACIA_SESION_SEGUNDOS = 30;

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
  private readonly claveAvisoSesion = 'lobby_session_warning_until';
  readonly segundosRestantesSesion = signal<number | null>(null);
  readonly avisoExtensionSesion = signal(false);
  readonly segundosGraciaSesion = signal(GRACIA_SESION_SEGUNDOS);
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

  extenderSesion(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}).pipe(
      tap(() => this.iniciarRelojSesion(true)),
    );
  }

  manejarSesionNoValida(): void {
    this.limpiarRelojSesion();
    void this.router.navigateByUrl('/login');
  }

  cerrarModalAvisoSesion(): void {
    this.avisoExtensionSesion.set(false);
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

    return this.http.post<unknown>(`${this.apiUrl}/autorizar`, {}).pipe(
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
      venceEn = Date.now() + DURACION_CONTADOR_SESION_MS;
      localStorage.setItem(this.claveVencimientoSesion, String(venceEn));
      localStorage.removeItem(this.claveAvisoSesion);
      this.avisoExtensionSesion.set(false);
    } else {
      venceEn = Number(localStorage.getItem(this.claveVencimientoSesion) ?? 0);
    }

    if (!venceEn) {
      this.segundosRestantesSesion.set(null);
      return;
    }

    const actualizar = (): void => {
      const segundos = Math.ceil((venceEn - Date.now()) / 1000);
      if (segundos <= 0) {
        this.mostrarAvisoExtension();
        return;
      }
      this.segundosRestantesSesion.set(segundos);
    };

    actualizar();
    if (!this.avisoExtensionSesion() && this.segundosRestantesSesion() !== null) {
      this.relojSesion = setInterval(actualizar, 1000);
    }
  }

  private mostrarAvisoExtension(): void {
    if (this.relojSesion) {
      clearInterval(this.relojSesion);
    }
    this.segundosRestantesSesion.set(0);
    this.avisoExtensionSesion.set(true);
    let venceAviso = Number(localStorage.getItem(this.claveAvisoSesion) ?? 0);
    if (!venceAviso) {
      venceAviso = Date.now() + GRACIA_SESION_SEGUNDOS * 1000;
      localStorage.setItem(this.claveAvisoSesion, String(venceAviso));
    }

    const actualizarGracia = (): void => {
      const segundos = Math.ceil((venceAviso - Date.now()) / 1000);
      if (segundos <= 0) {
        this.segundosGraciaSesion.set(0);
        if (this.relojSesion) {
          clearInterval(this.relojSesion);
          this.relojSesion = undefined;
        }
        return;
      }
      this.segundosGraciaSesion.set(segundos);
    };

    actualizarGracia();
    this.relojSesion = setInterval(actualizarGracia, 1000);
  }

  private limpiarRelojSesion(): void {
    if (this.relojSesion) {
      clearInterval(this.relojSesion);
    }
    this.relojSesion = undefined;
    this.segundosRestantesSesion.set(null);
    this.avisoExtensionSesion.set(false);
    this.segundosGraciaSesion.set(GRACIA_SESION_SEGUNDOS);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.claveVencimientoSesion);
      localStorage.removeItem(this.claveAvisoSesion);
    }
  }
}
