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
  comentarios: number;
  autor: CreatedPublication['autor'] | null;
}

export interface PublicationComment {
  id: string;
  mensaje: string;
  createdAt: string;
  autor: CreatedPublication['autor'] | null;
}

export interface PublicationPage {
  items: Publication[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/publicaciones`;

  list(offset: number, limit = 5, orden: 'fecha' | 'me-gusta' = 'fecha', usuario?: string): Observable<PublicationPage> {
    const params: Record<string, string | number> = { offset, limit, orden };
    if (usuario) params['usuario'] = usuario;
    return this.http.get<PublicationPage>(this.apiUrl, { params });
  }

  myLikes(): Observable<{ publicacionIds: string[] }> {
    return this.http.get<{ publicacionIds: string[] }>(`${this.apiUrl}/me-gustas`);
  }

  addLike(publicationId: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.post<{ liked: boolean; likes: number }>(`${this.apiUrl}/${publicationId}/me-gusta`, {});
  }

  removeLike(publicationId: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.delete<{ liked: boolean; likes: number }>(`${this.apiUrl}/${publicationId}/me-gusta`);
  }

  listComments(publicationId: string): Observable<PublicationComment[]> {
    return this.http.get<PublicationComment[]>(`${this.apiUrl}/${publicationId}/comentarios`);
  }

  createComment(publicationId: string, mensaje: string): Observable<PublicationComment> {
    return this.http.post<PublicationComment>(`${this.apiUrl}/${publicationId}/comentarios`, { mensaje });
  }

  delete(publicationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${publicationId}`);
  }

  create(titulo: string, descripcion: string, imagen?: File): Observable<CreatedPublication> {
    const body = new FormData();
    body.append('titulo', titulo);
    body.append('descripcion', descripcion);
    if (imagen) body.append('imagen', imagen);
    return this.http.post<CreatedPublication>(this.apiUrl, body);
  }
}
