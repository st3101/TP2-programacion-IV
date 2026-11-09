import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

export interface ProfileComment {
  id: string;
  mensaje: string;
  createdAt: string;
  autor: { id: string; nombre: string; apellido: string; nombreUsuario: string };
}

export interface ProfilePost {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  createdAt: string;
  comentarios: ProfileComment[];
}

export interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfilUrl: string;
  perfil: string;
}

export interface MyProfileResponse {
  usuario: UserProfile;
  publicaciones: ProfilePost[];
}

export type ProfileUpdate = Pick<
  UserProfile,
  'nombre' | 'apellido' | 'nombreUsuario' | 'fechaNacimiento' | 'descripcion'
>;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/usuarios/me`;

  getMyProfile(): Observable<MyProfileResponse> {
    return this.http.get<MyProfileResponse>(this.apiUrl);
  }

  updateMyProfile(profile: ProfileUpdate, imagenPerfil?: File): Observable<MyProfileResponse> {
    const body = new FormData();
    for (const [key, value] of Object.entries(profile)) body.append(key, value);
    if (imagenPerfil) body.append('imagenPerfil', imagenPerfil);
    return this.http.patch<MyProfileResponse>(this.apiUrl, body);
  }
}
