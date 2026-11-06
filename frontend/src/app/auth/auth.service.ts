import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
  private readonly apiUrl = '/api/auth';
  private readonly oldTokenKey = 'lobby_access_token';

  constructor() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.oldTokenKey);
      sessionStorage.removeItem(this.oldTokenKey);
    }
  }
  login(identificador: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { identificador, password });
  }

  register(payload: RegisterPayload, imagenPerfil?: File): Observable<AuthResponse> {
    const body = new FormData();
    for (const [key, value] of Object.entries(payload)) body.append(key, value);
    if (imagenPerfil) body.append('imagenPerfil', imagenPerfil);

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, body);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {});
  }
}
