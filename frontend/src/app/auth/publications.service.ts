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
  modificado: boolean;
  autor: CreatedPublication['autor'] | null;
}

export interface CommentPage {
  items: PublicationComment[];
  pagina: number;
  cantidad: number;
  total: number;
  paginasTotales: number;
}

export interface PublicationPage {
  items: Publication[];
  pagina: number;
  cantidad: number;
  total: number;
  paginasTotales: number;
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/publicaciones`;

  listarPublicaciones(
    pagina: number,
    cantidad = 5,
    orden: 'fecha' | 'me-gusta' = 'fecha',
    usuario?: string,
  ): Observable<PublicationPage> {
    const params: Record<string, string | number> = { pagina, cantidad, orden };
    if (usuario) {
      params['usuario'] = usuario;
    }
    return this.http.get<PublicationPage>(this.apiUrl, { params });
  }

  obtenerMisMeGustas(): Observable<{ publicacionIds: string[] }> {
    return this.http.get<{ publicacionIds: string[] }>(`${this.apiUrl}/me-gustas`);
  }

  agregarMeGusta(publicationId: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.post<{ liked: boolean; likes: number }>(`${this.apiUrl}/${publicationId}/me-gusta`, {});
  }

  quitarMeGusta(publicationId: string): Observable<{ liked: boolean; likes: number }> {
    return this.http.delete<{ liked: boolean; likes: number }>(`${this.apiUrl}/${publicationId}/me-gusta`);
  }

  listarComentarios(publicationId: string, pagina = 1, cantidad = 5): Observable<CommentPage> {
    const params = { pagina, cantidad };
    return this.http.get<CommentPage>(`${this.apiUrl}/${publicationId}/comentarios`, { params });
  }

  crearComentario(publicationId: string, mensaje: string): Observable<PublicationComment> {
    return this.http.post<PublicationComment>(`${this.apiUrl}/${publicationId}/comentarios`, { mensaje });
  }

  editarComentario(publicationId: string, comentarioId: string, mensaje: string): Observable<PublicationComment> {
    return this.http.put<PublicationComment>(`${this.apiUrl}/${publicationId}/comentarios/${comentarioId}`, { mensaje });
  }

  eliminarPublicacion(publicationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${publicationId}`);
  }

  crearPublicacion(
    titulo: string,
    descripcion: string,
    imagen?: File,
  ): Observable<CreatedPublication> {
    const body = new FormData();
    body.append('titulo', titulo);
    body.append('descripcion', descripcion);
    if (imagen) {
      body.append('imagen', imagen);
    }
    return this.http.post<CreatedPublication>(this.apiUrl, body);
  }
}
