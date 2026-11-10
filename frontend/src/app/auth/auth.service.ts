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
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${API_BASE_URL}/api/auth`;
  private readonly oldTokenKey = 'lobby_access_token';
  private readonly sessionExpiryKey = 'lobby_session_expires_at';
  readonly sessionRemainingSeconds = signal<number | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.oldTokenKey);
      sessionStorage.removeItem(this.oldTokenKey);
    }
    this.scheduleSessionExpiry();
  }

  login(identificador: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { identificador, password }).pipe(
      tap(() => this.startSessionExpiry()),
    );
  }

  register(payload: RegisterPayload, imagenPerfil?: File): Observable<AuthResponse> {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload)) body.append(key, value);
    if (imagenPerfil) body.append('imagenPerfil', imagenPerfil);

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, body).pipe(
      tap(() => this.startSessionExpiry()),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      finalize(() => this.clearSessionExpiry()),
    );
  }

  validateSession(): Observable<boolean> {
    const expiresAt = typeof localStorage === 'undefined'
      ? 0
      : Number(localStorage.getItem(this.sessionExpiryKey) ?? 0);
    if (expiresAt && expiresAt <= Date.now()) {
      this.clearSessionExpiry();
      return of(false);
    }

    return this.http.get<unknown>(`${API_BASE_URL}/api/usuarios/me`).pipe(
      map(() => {
        if (!expiresAt) this.startSessionExpiry();
        return true;
      }),
      catchError(() => {
        this.clearSessionExpiry();
        return of(false);
      }),
    );
  }

  private startSessionExpiry(): void {
    if (typeof localStorage === 'undefined') return;
    const expiresAt = Date.now() + 30 * 60 * 1000;
    localStorage.setItem(this.sessionExpiryKey, String(expiresAt));
    this.scheduleSessionExpiry();
  }

  private scheduleSessionExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (typeof localStorage === 'undefined') return;
    const expiresAt = Number(localStorage.getItem(this.sessionExpiryKey) ?? 0);
    if (!expiresAt) {
      this.sessionRemainingSeconds.set(null);
      return;
    }

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      this.clearSessionExpiry();
      void this.router.navigateByUrl('/login');
      return;
    }

    this.updateSessionCountdown(expiresAt);
    this.countdownInterval = setInterval(() => this.updateSessionCountdown(expiresAt), 1000);
    this.expiryTimer = setTimeout(() => {
      this.clearSessionExpiry();
      void this.router.navigateByUrl('/login');
    }, remaining);
  }

  private updateSessionCountdown(expiresAt: number): void {
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    this.sessionRemainingSeconds.set(remainingSeconds);
    if (remainingSeconds === 0) {
      this.clearSessionExpiry();
      void this.router.navigateByUrl('/login');
    }
  }

  private clearSessionExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.expiryTimer = undefined;
    this.countdownInterval = undefined;
    this.sessionRemainingSeconds.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.sessionExpiryKey);
  }
}
