import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { API_BASE_URL } from '../../api-base-url';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { AdminDateFilterComponent } from '../../shared/admin-date-filter/admin-date-filter.component';
import { AdminStatisticsChartComponent, GraficoBarraItem } from '../../shared/admin-statistics-chart/admin-statistics-chart.component';

interface UsuarioEstadistica {
  id: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  cantidad: number;
}

interface EstadisticasPublicaciones {
  desde: string;
  hasta: string;
  totalPublicaciones: number;
  usuarios: UsuarioEstadistica[];
}

interface EstadisticasComentarios {
  desde: string;
  hasta: string;
  totalComentarios: number;
  comentariosPorDia: { fecha: string; cantidad: number }[];
}

interface EstadisticasComentariosPorPublicacion {
  desde: string;
  hasta: string;
  totalComentarios: number;
  publicaciones: { id: string; titulo: string; cantidad: number }[];
}

function fechaParaInput(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function crearRangoInicial() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  return { desde: fechaParaInput(desde), hasta: fechaParaInput(hasta) };
}

@Component({
  selector: 'app-admin-statistics-page',
  imports: [NavbarComponent, AdminDateFilterComponent, AdminStatisticsChartComponent],
  templateUrl: './admin-statistics-page.component.html',
  styleUrl: './admin-statistics-page.component.css',
})
export class AdminStatisticsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rangoInicial = crearRangoInicial();

  protected readonly desdePublicaciones = signal(this.rangoInicial.desde);
  protected readonly hastaPublicaciones = signal(this.rangoInicial.hasta);
  protected readonly desdeComentarios = signal(this.rangoInicial.desde);
  protected readonly hastaComentarios = signal(this.rangoInicial.hasta);
  protected readonly desdeComentariosPorPublicacion = signal(this.rangoInicial.desde);
  protected readonly hastaComentariosPorPublicacion = signal(this.rangoInicial.hasta);
  protected readonly cargandoPublicaciones = signal(false);
  protected readonly cargandoComentarios = signal(false);
  protected readonly cargandoComentariosPorPublicacion = signal(false);
  protected readonly errorPublicaciones = signal('');
  protected readonly errorComentarios = signal('');
  protected readonly errorComentariosPorPublicacion = signal('');
  protected readonly publicaciones = signal<EstadisticasPublicaciones | null>(null);
  protected readonly comentarios = signal<EstadisticasComentarios | null>(null);
  protected readonly comentariosPorPublicacion = signal<EstadisticasComentariosPorPublicacion | null>(null);
  protected readonly elementosPublicaciones = signal<GraficoBarraItem[]>([]);
  protected readonly elementosComentarios = signal<GraficoBarraItem[]>([]);
  protected readonly elementosComentariosPorPublicacion = signal<GraficoBarraItem[]>([]);

  ngOnInit(): void {
    this.buscarPublicaciones();
    this.buscarComentarios();
    this.buscarComentariosPorPublicacion();
  }

  protected cambiarDesdePublicaciones(fecha: string): void {
    this.desdePublicaciones.set(fecha);
  }

  protected cambiarHastaPublicaciones(fecha: string): void {
    this.hastaPublicaciones.set(fecha);
  }

  protected cambiarDesdeComentarios(fecha: string): void {
    this.desdeComentarios.set(fecha);
  }

  protected cambiarHastaComentarios(fecha: string): void {
    this.hastaComentarios.set(fecha);
  }

  protected cambiarDesdeComentariosPorPublicacion(fecha: string): void {
    this.desdeComentariosPorPublicacion.set(fecha);
  }

  protected cambiarHastaComentariosPorPublicacion(fecha: string): void {
    this.hastaComentariosPorPublicacion.set(fecha);
  }

  protected buscarPublicaciones(): void {
    if (!this.validarFechas(this.desdePublicaciones(), this.hastaPublicaciones(), this.errorPublicaciones)) {
      return;
    }

    this.cargandoPublicaciones.set(true);
    this.errorPublicaciones.set('');
    this.http.get<EstadisticasPublicaciones>(`${API_BASE_URL}/api/usuarios/estadisticas/publicaciones`, {
      params: { desde: this.desdePublicaciones(), hasta: this.hastaPublicaciones() },
    }).subscribe({
      next: (resultado) => {
        this.publicaciones.set(resultado);
        const usuariosConPublicaciones = resultado.usuarios.filter((usuario) => usuario.cantidad > 0);
        this.elementosPublicaciones.set(usuariosConPublicaciones.map((usuario) => ({
          id: usuario.id,
          etiqueta: `${usuario.nombre} ${usuario.apellido}`,
          detalle: `@${usuario.nombreUsuario}`,
          cantidad: usuario.cantidad,
        })));
      },
      error: (respuesta: HttpErrorResponse) => {
        this.errorPublicaciones.set(this.mensajeDeError(respuesta, 'No se pudieron cargar las publicaciones.'));
        this.cargandoPublicaciones.set(false);
      },
      complete: () => this.cargandoPublicaciones.set(false),
    });
  }

  protected buscarComentarios(): void {
    if (!this.validarFechas(this.desdeComentarios(), this.hastaComentarios(), this.errorComentarios)) {
      return;
    }

    this.cargandoComentarios.set(true);
    this.errorComentarios.set('');
    this.http.get<EstadisticasComentarios>(`${API_BASE_URL}/api/usuarios/estadisticas/comentarios`, {
      params: { desde: this.desdeComentarios(), hasta: this.hastaComentarios() },
    }).subscribe({
      next: (resultado) => {
        this.comentarios.set(resultado);
        this.elementosComentarios.set(resultado.comentariosPorDia.map((dia) => ({
          id: dia.fecha,
          etiqueta: dia.fecha,
          cantidad: dia.cantidad,
        })));
      },
      error: (respuesta: HttpErrorResponse) => {
        this.errorComentarios.set(this.mensajeDeError(respuesta, 'No se pudieron cargar los comentarios.'));
        this.cargandoComentarios.set(false);
      },
      complete: () => this.cargandoComentarios.set(false),
    });
  }

  protected buscarComentariosPorPublicacion(): void {
    if (!this.validarFechas(
      this.desdeComentariosPorPublicacion(),
      this.hastaComentariosPorPublicacion(),
      this.errorComentariosPorPublicacion,
    )) {
      return;
    }

    this.cargandoComentariosPorPublicacion.set(true);
    this.errorComentariosPorPublicacion.set('');
    this.http.get<EstadisticasComentariosPorPublicacion>(
      `${API_BASE_URL}/api/usuarios/estadisticas/comentarios-por-publicacion`,
      {
        params: {
          desde: this.desdeComentariosPorPublicacion(),
          hasta: this.hastaComentariosPorPublicacion(),
        },
      },
    ).subscribe({
      next: (resultado) => {
        this.comentariosPorPublicacion.set(resultado);
        this.elementosComentariosPorPublicacion.set(resultado.publicaciones.map((publicacion) => ({
          id: publicacion.id,
          etiqueta: publicacion.titulo,
          cantidad: publicacion.cantidad,
        })));
      },
      error: (respuesta: HttpErrorResponse) => {
        this.errorComentariosPorPublicacion.set(
          this.mensajeDeError(respuesta, 'No se pudieron cargar los comentarios por publicación.'),
        );
        this.cargandoComentariosPorPublicacion.set(false);
      },
      complete: () => this.cargandoComentariosPorPublicacion.set(false),
    });
  }

  private validarFechas(desde: string, hasta: string, guardarError: typeof this.errorPublicaciones): boolean {
    if (!desde || !hasta) {
      guardarError.set('Elegí una fecha de inicio y una fecha de fin.');
      return false;
    }
    if (desde > hasta) {
      guardarError.set('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return false;
    }
    return true;
  }

  private mensajeDeError(respuesta: HttpErrorResponse, mensajeAlternativo: string): string {
    const mensaje = respuesta.error?.message;
    if (typeof mensaje === 'string') {
      return mensaje;
    }
    return mensajeAlternativo;
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
