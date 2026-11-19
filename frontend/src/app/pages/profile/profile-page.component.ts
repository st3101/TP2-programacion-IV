import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { MyProfileResponse, ProfileService } from '../../auth/profile.service';
import { PublicationComment, PublicationsService } from '../../auth/publications.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PublicationCardComponent } from '../../shared/publication-card/publication-card.component';
import { PublicationDetailModalComponent, PublicationDetailPost } from '../../shared/publication-detail-modal/publication-detail-modal.component';
import { FechaLobbyPipe } from '../../shared/pipes/fecha-lobby.pipe';
import { NombrePropioPipe } from '../../shared/pipes/nombre-propio.pipe';
import { PublicationCommentFormComponent } from '../../shared/publication-comment-form/publication-comment-form.component';

@Component({
  selector: 'app-profile-page',
  imports: [FechaLobbyPipe, NombrePropioPipe, FormField, RouterLink, NavbarComponent, PublicationCardComponent, PublicationDetailModalComponent, PublicationCommentFormComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css',
})
export class ProfilePageComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly publicacionesService = inject(PublicationsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly profile = signal<MyProfileResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly editing = signal(false);
  protected readonly message = signal('');
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly selectedImageName = signal('');
  protected readonly selectedPublication = signal<PublicationDetailPost | null>(null);
  protected readonly publicacionAEliminar = signal('');
  protected readonly eliminandoPublicacion = signal('');
  protected readonly comentariosPorPublicacion = signal<Record<string, PublicationComment[]>>({});
  protected readonly borradoresComentario = signal<Record<string, string>>({});
  protected readonly comentariosEnviando = signal<ReadonlySet<string>>(new Set());
  protected readonly paginasComentarios = signal<Record<string, number>>({});
  protected readonly paginasTotalesComentarios = signal<Record<string, number>>({});
  protected readonly comentariosCargando = signal<Record<string, boolean>>({});
  protected readonly erroresComentarios = signal<Record<string, string>>({});
  private readonly cantidadComentariosPorPagina = 3;
  private readonly datosFormulario = signal({
    nombre: '',
    apellido: '',
    nombreUsuario: '',
    fechaNacimiento: '',
    descripcion: '',
  });
  protected readonly formulario = form(this.datosFormulario, (campos) => {
    required(campos.nombre);
    maxLength(campos.nombre, 80);
    required(campos.apellido);
    maxLength(campos.apellido, 80);
    required(campos.nombreUsuario);
    minLength(campos.nombreUsuario, 3);
    maxLength(campos.nombreUsuario, 30);
    required(campos.fechaNacimiento);
    maxLength(campos.descripcion, 280);
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        for (const post of profile.publicaciones) {
          this.cargarPaginaComentarios(post.id, 1);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 401) {
          this.authService.logout();
          void this.router.navigateByUrl('/login');
          return;
        }
        this.message.set('No pudimos cargar tu perfil. Revisá que el backend esté conectado.');
      },
      complete: () => this.loading.set(false),
    });
  }

  protected initials(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toLocaleUpperCase('es-AR');
  }

  protected openPublication(post: MyProfileResponse['publicaciones'][number]): void {
    const user = this.profile()?.usuario;
    if (!user) {
      return;
    }
    this.selectedPublication.set({
      id: post.id,
      title: post.titulo,
      message: post.descripcion,
      imageUrl: post.imagenUrl || undefined,
      game: 'Comunidad',
      author: `${user.nombre} ${user.apellido}`,
      handle: user.nombreUsuario,
      initials: this.initials(user.nombre, user.apellido),
      likes: post.cantidadMeGusta,
      comments: post.cantidadComentarios,
      timeLabel: new Date(post.createdAt).toLocaleString('es-AR'),
    });
  }

  protected comentariosDe(publicacionId: string): PublicationComment[] {
    return this.comentariosPorPublicacion()[publicacionId] ?? [];
  }

  protected comentariosEstanCargando(publicacionId: string): boolean {
    return this.comentariosCargando()[publicacionId] ?? false;
  }

  protected errorDeComentarios(publicacionId: string): string {
    return this.erroresComentarios()[publicacionId] ?? '';
  }

  protected textoComentario(publicacionId: string): string {
    return this.borradoresComentario()[publicacionId] ?? '';
  }

  protected comentarioSeEstaEnviando(publicacionId: string): boolean {
    return this.comentariosEnviando().has(publicacionId);
  }

  protected actualizarBorradorComentario(publicacionId: string, entrada: Event | string): void {
    let texto: string;
    if (typeof entrada === 'string') {
      texto = entrada;
    } else {
      const campo = entrada.target;
      if (!(campo instanceof HTMLTextAreaElement)) {
        return;
      }
      texto = campo.value;
    }

    this.borradoresComentario.update((borradores) => ({
      ...borradores,
      [publicacionId]: texto,
    }));
  }

  protected enviarComentario(publicacionId: string, event?: Event): void {
    event?.preventDefault();
    const mensaje = this.textoComentario(publicacionId).trim();

    if (!mensaje || this.comentarioSeEstaEnviando(publicacionId)) {
      return;
    }

    this.comentariosEnviando.update((actuales) => new Set(actuales).add(publicacionId));
    this.erroresComentarios.update((errores) => ({ ...errores, [publicacionId]: '' }));

    this.publicacionesService.crearComentario(publicacionId, mensaje).subscribe({
      next: (comentario) => {
        const comentariosAnteriores = this.comentariosDe(publicacionId);
        this.comentariosPorPublicacion.update((comentarios) => ({
          ...comentarios,
          [publicacionId]: [comentario, ...comentariosAnteriores],
        }));
        this.borradoresComentario.update((borradores) => ({ ...borradores, [publicacionId]: '' }));
        this.erroresComentarios.update((errores) => ({ ...errores, [publicacionId]: '' }));
        this.profile.update((perfil) => {
          if (!perfil) {
            return perfil;
          }
          return {
            ...perfil,
            publicaciones: perfil.publicaciones.map((publicacion) => {
              if (publicacion.id !== publicacionId) {
                return publicacion;
              }
              return { ...publicacion, cantidadComentarios: publicacion.cantidadComentarios + 1 };
            }),
          };
        });
        this.selectedPublication.update((publicacion) => {
          if (!publicacion || String(publicacion.id) !== publicacionId) {
            return publicacion;
          }
          return { ...publicacion, comments: publicacion.comments + 1 };
        });
        this.marcarComentarioComoEnviado(publicacionId);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.erroresComentarios.update((errores) => ({
            ...errores,
            [publicacionId]: 'Iniciá sesión de nuevo para comentar.',
          }));
        } else {
          this.erroresComentarios.update((errores) => ({
            ...errores,
            [publicacionId]: 'No se pudo enviar el comentario. Intentá otra vez.',
          }));
        }
        this.marcarComentarioComoEnviado(publicacionId);
      },
    });
  }

  private marcarComentarioComoEnviado(publicacionId: string): void {
    this.comentariosEnviando.update((actuales) => {
      const nuevos = new Set(actuales);
      nuevos.delete(publicacionId);
      return nuevos;
    });
  }

  protected hayMasComentarios(publicacionId: string): boolean {
    const paginaActual = this.paginasComentarios()[publicacionId] ?? 0;
    const paginasTotales = this.paginasTotalesComentarios()[publicacionId] ?? 0;
    return paginaActual < paginasTotales;
  }

  protected cargarMasComentarios(publicacionId: string): void {
    if (!this.hayMasComentarios(publicacionId) || this.comentariosEstanCargando(publicacionId)) {
      return;
    }
    const paginaSiguiente = (this.paginasComentarios()[publicacionId] ?? 0) + 1;
    this.cargarPaginaComentarios(publicacionId, paginaSiguiente);
  }

  private cargarPaginaComentarios(publicacionId: string, pagina: number): void {
    this.comentariosCargando.update((estado) => ({ ...estado, [publicacionId]: true }));
    this.erroresComentarios.update((estado) => ({ ...estado, [publicacionId]: '' }));

    this.publicacionesService.listarComentarios(publicacionId, pagina, this.cantidadComentariosPorPagina).subscribe({
      next: (respuesta) => {
        const anteriores = this.comentariosDe(publicacionId);
        const idsAnteriores = new Set(anteriores.map((comentario) => comentario.id));
        const nuevos = respuesta.items.filter((comentario) => !idsAnteriores.has(comentario.id));
        this.comentariosPorPublicacion.update((estado) => ({
          ...estado,
          [publicacionId]: [...anteriores, ...nuevos],
        }));
        this.paginasComentarios.update((estado) => ({ ...estado, [publicacionId]: respuesta.pagina }));
        this.paginasTotalesComentarios.update((estado) => ({ ...estado, [publicacionId]: respuesta.paginasTotales }));
      },
      error: () => {
        this.erroresComentarios.update((estado) => ({ ...estado, [publicacionId]: 'No pudimos cargar los comentarios.' }));
        this.comentariosCargando.update((estado) => ({ ...estado, [publicacionId]: false }));
      },
      complete: () => {
        this.comentariosCargando.update((estado) => ({ ...estado, [publicacionId]: false }));
      },
    });
  }

  protected closePublication(): void {
    this.selectedPublication.set(null);
  }

  protected solicitarEliminarPublicacion(publicacionId: string): void {
    this.message.set('');
    this.publicacionAEliminar.set(publicacionId);
  }

  protected cancelarEliminarPublicacion(): void {
    this.publicacionAEliminar.set('');
  }

  protected eliminarPublicacion(publicacionId: string): void {
    if (this.eliminandoPublicacion()) {
      return;
    }

    this.message.set('');
    this.eliminandoPublicacion.set(publicacionId);
    this.publicacionesService.eliminarPublicacion(publicacionId).subscribe({
      next: () => {
        this.publicacionAEliminar.set('');
        this.eliminandoPublicacion.set('');
        this.selectedPublication.set(null);
        this.message.set('Publicación eliminada correctamente.');
        this.loadProfile();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.message.set('No tenés permiso para eliminar esta publicación.');
        } else if (error.status === 401) {
          this.message.set('Iniciá sesión de nuevo para eliminar la publicación.');
        } else {
          this.message.set('No se pudo eliminar la publicación. Intentá otra vez.');
        }

        this.publicacionAEliminar.set('');
        this.eliminandoPublicacion.set('');
      },
    });
  }

  protected dateInput(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  protected startEditing(): void {
    const usuario = this.profile()?.usuario;
    if (!usuario) {
      return;
    }

    this.message.set('');
    this.datosFormulario.set({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombreUsuario: usuario.nombreUsuario,
      fechaNacimiento: this.dateInput(usuario.fechaNacimiento),
      descripcion: usuario.descripcion ?? '',
    });
    this.formulario().reset();
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.message.set('');
    this.selectedImage.set(null);
    this.selectedImageName.set('');
  }

  protected onImageSelected(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const image = input?.files?.[0];
    this.message.set('');
    if (!image) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      this.message.set('La foto debe ser JPG, PNG o WEBP.');
      if (input) input.value = '';
      return;
    }
    if (image.size > 25 * 1024 * 1024) {
      this.message.set('La foto debe pesar 25 MB o menos.');
      if (input) input.value = '';
      return;
    }
    this.selectedImage.set(image);
    this.selectedImageName.set(image.name);
  }

  protected saveProfile(event: Event): void {
    event.preventDefault();

    void submit(this.formulario, async () => {
      const usuarioActual = this.profile()?.usuario;
      if (!usuarioActual) {
        return;
      }

      this.message.set('');

      try {
        const datos = this.datosFormulario();
        const profile = await firstValueFrom(this.profileService.updateMyProfile({
          nombre: datos.nombre,
          apellido: datos.apellido,
          nombreUsuario: datos.nombreUsuario,
          fechaNacimiento: datos.fechaNacimiento,
          descripcion: datos.descripcion,
        }, this.selectedImage() ?? undefined));

        this.profile.set(profile);
        this.editing.set(false);
        this.selectedImage.set(null);
        this.selectedImageName.set('');
        this.message.set('Perfil actualizado.');
      } catch (error) {
        if (error instanceof HttpErrorResponse) {
          const detail = error.error?.message;
          if (Array.isArray(detail)) {
            this.message.set(detail.join(' '));
            return;
          }

          if (typeof detail === 'string') {
            this.message.set(detail);
            return;
          }
        }

        this.message.set('No se pudo guardar el perfil. Intentá de nuevo.');
      }
    });
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
