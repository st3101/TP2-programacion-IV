import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

export interface CreatedPublication {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  createdAt: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    nombreUsuario: string;
    imagenPerfilUrl: string;
  };
}

export interface Publication {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  createdAt: string;
  likes: number;
  autor: CreatedPublication['autor'] | null;
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/publicaciones`;

  list(): Observable<Publication[]> {
    return this.http.get<Publication[]>(this.apiUrl);
  }

  myLikes(): Observable<{ publicacionIds: string[] }> {
    return this.http.get<{ publicacionIds: string[] }>(`${this.apiUrl}/me-gustas`);
  }

  toggleLike(publicationId: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.post<{ liked: boolean; likes: number }>(`${this.apiUrl}/${publicationId}/me-gusta`, {});
  }

  create(titulo: string, descripcion: string, imagen?: File): Observable<CreatedPublication> {
    const body = new FormData();
    body.append('titulo', titulo);
    body.append('descripcion', descripcion);
    if (imagen) body.append('imagen', imagen);
    return this.http.post<CreatedPublication>(this.apiUrl, body);
  }
}
