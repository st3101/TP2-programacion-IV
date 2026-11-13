import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionDurationMs = 10 * 60 * 1000;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${API_BASE_URL}/api/auth`;
  private readonly oldTokenKey = 'lobby_access_token';
  private readonly sessionExpiryKey = 'lobby_session_expires_at';
  readonly sessionRemainingSeconds = signal<number | null>(null);
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.oldTokenKey);
      sessionStorage.removeItem(this.oldTokenKey);
      const storedExpiry = localStorage.getItem(this.sessionExpiryKey);
      let expiresAt = 0;
      if (storedExpiry !== null) {
        expiresAt = Number(storedExpiry);
      }
      if (expiresAt) {
        this.iniciarCuentaRegresiva(expiresAt);
      }
    }
  }

  login(identificador: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { identificador, password }).pipe(
      tap(() => this.iniciarCuentaRegresiva()),
    );
  }

  register(payload: RegisterPayload, imagenPerfil?: File): Observable<AuthResponse> {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload)) body.append(key, value);
    if (imagenPerfil) {
      body.append('imagenPerfil', imagenPerfil);
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, body).pipe(
      tap(() => this.iniciarCuentaRegresiva()),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      finalize(() => this.limpiarVencimientoSesion()),
    );
  }

  validateSession(): Observable<boolean> {
    let expiresAt = 0;
    if (typeof localStorage !== 'undefined') {
      const storedExpiry = localStorage.getItem(this.sessionExpiryKey);
      if (storedExpiry !== null) {
        expiresAt = Number(storedExpiry);
      }
    }

    if (expiresAt && expiresAt <= Date.now()) {
      this.limpiarVencimientoSesion();
      return of(false);
    }

    return this.http.get<unknown>(`${API_BASE_URL}/api/usuarios/me`).pipe(
      map(() => {
        if (!expiresAt) {
          this.iniciarCuentaRegresiva();
        }
        return true;
      }),
      catchError(() => {
        this.limpiarVencimientoSesion();
        return of(false);
      }),
    );
  }

  private iniciarCuentaRegresiva(expiresAt = Date.now() + this.sessionDurationMs): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    localStorage.setItem(this.sessionExpiryKey, String(expiresAt));
    const actualizarCuentaRegresiva = () => {
      const segundosRestantes = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      this.sessionRemainingSeconds.set(segundosRestantes);
      if (segundosRestantes === 0) {
        this.limpiarVencimientoSesion();
        void this.router.navigateByUrl('/login');
      }
    };

    actualizarCuentaRegresiva();
    if (expiresAt > Date.now()) {
      this.countdownInterval = setInterval(actualizarCuentaRegresiva, 1000);
    }
  }

  private limpiarVencimientoSesion(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = undefined;
    this.sessionRemainingSeconds.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.sessionExpiryKey);
    }
  }
}
