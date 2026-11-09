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
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/publicaciones`;

  create(titulo: string, descripcion: string, imagen?: File): Observable<CreatedPublication> {
    const body = new FormData();
    body.append('titulo', titulo);
    body.append('descripcion', descripcion);
    if (imagen) body.append('imagen', imagen);
    return this.http.post<CreatedPublication>(this.apiUrl, body);
  }
}
