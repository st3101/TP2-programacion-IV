import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ProfileService } from '../../auth/profile.service';
import { PublicationComment, PublicationsService } from '../../auth/publications.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PublicationCardComponent } from '../../shared/publication-card/publication-card.component';
import { PublicationDetailModalComponent, PublicationDetailPost } from '../../shared/publication-detail-modal/publication-detail-modal.component';

type FeedSort = 'recent' | 'popular';

interface FeedPost {
  id: number | string;
  authorId: string;
  author: string;
  handle: string;
  initials: string;
  avatarTone: 'ember' | 'stone' | 'plum';
  game: string;
  title: string;
  message: string;
  timeLabel: string;
  createdAt: number;
  likes: number;
  liked: boolean;
  comments: number;
  art: 'underworld' | 'afterlight' | 'newdawn';
  imageUrl?: string;
}

@Component({
  selector: 'app-feed-page',
  imports: [FormField, NavbarComponent, PublicationCardComponent, PublicationDetailModalComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.css',
})
export class FeedPageComponent implements OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly publicationsService = inject(PublicationsService);
  private readonly profileService = inject(ProfileService);
  protected readonly sortMode = signal<FeedSort>('recent');
  protected readonly authorFilter = signal('');
  private readonly datosPublicacion = signal({ titulo: '', descripcion: '' });
  protected readonly formularioPublicacion = form(this.datosPublicacion, (campos) => {
    required(campos.titulo);
    pattern(campos.titulo, /\S/);
    maxLength(campos.titulo, 120);
    required(campos.descripcion);
    pattern(campos.descripcion, /\S/);
    maxLength(campos.descripcion, 10000);
  });
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imageName = signal('');
  protected readonly publishError = signal('');
  protected readonly feedError = signal('');
  protected readonly loadingFeed = signal(false);
  protected readonly totalPublications = signal(0);
  protected readonly paginaActual = signal(1);
  private readonly publicacionesPorPagina = 5;
  protected readonly paginasTotales = signal(1);
  protected readonly likeError = signal('');
  protected readonly deleteError = signal('');
  protected readonly pendingLikes = signal<ReadonlySet<string>>(new Set());
  protected readonly composerOpen = signal(false);
  protected readonly posts = signal<FeedPost[]>([]);
  protected readonly selectedPost = signal<PublicationDetailPost | null>(null);
  protected readonly currentUserId = signal('');
  protected readonly confirmDeleteId = signal('');
  protected readonly deletingPostId = signal('');
  protected readonly commentsByPost = signal<Record<string, PublicationComment[]>>({});
  protected readonly borradoresComentario = signal<Record<string, string>>({});
  protected readonly comentarioEnEdicion = signal('');
  protected readonly textoEdicionComentario = signal('');
  protected readonly paginaComentariosPorPublicacion = signal<Record<string, number>>({});
  protected readonly paginasTotalesComentarios = signal<Record<string, number>>({});
  protected readonly commentsLoading = signal<ReadonlySet<string>>(new Set());
  protected readonly commentsSubmitting = signal<ReadonlySet<string>>(new Set());
  protected readonly commentErrors = signal<Record<string, string>>({});
  private readonly comentariosPorPagina = 3;
  private feedRequestVersion = 0;
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;
  private readonly esperaBusquedaMs = 300;
  private readonly likedPublicationIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.cargarPagina(1);
    this.profileService.getMyProfile().subscribe({
      next: ({ usuario }) => this.currentUserId.set(usuario.id),
    });
    this.publicationsService.obtenerMisMeGustas().subscribe({
      next: ({ publicacionIds }) => {
        const likedIds = new Set(publicacionIds);
        this.likedPublicationIds.set(likedIds);
        this.posts.update((posts) => posts.map((post) => ({ ...post, liked: likedIds.has(String(post.id)) })));
      },
    });
  }

  ngOnDestroy(): void {
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
  }

  protected cargarPagina(pagina: number): void {
    if (this.loadingFeed()) {
      return;
    }

    if (pagina < 1 || pagina > this.paginasTotales()) {
      return;
    }

    this.loadingFeed.set(true);
    this.feedError.set('');
    const requestVersion = this.feedRequestVersion;
    const usuarioBuscado = this.authorFilter().trim() || undefined;
    const orden = this.sortMode() === 'popular' ? 'me-gusta' : 'fecha';
    this.publicationsService.listarPublicaciones(pagina, this.publicacionesPorPagina, orden, usuarioBuscado).subscribe({
      next: (result) => {
        if (requestVersion !== this.feedRequestVersion) {
          return;
        }

        const publicacionesDeLaPagina = result.items.map((publication, index) => {
          const author = publication.autor;
          const name = `${author?.nombre ?? ''} ${author?.apellido ?? ''}`.trim();
          const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || '??';

          return {
            id: publication.id,
            authorId: author?.id ?? '',
            author: name || author?.nombreUsuario || 'Jugador',
            handle: author?.nombreUsuario || 'jugador',
            initials,
            avatarTone: (['ember', 'stone', 'plum'] as const)[index % 3],
            game: 'Comunidad' as const,
            title: publication.titulo,
            message: publication.descripcion,
            imageUrl: publication.imagenUrl || undefined,
            timeLabel: this.formatearTiempo(publication.createdAt),
            createdAt: new Date(publication.createdAt).getTime() || Date.now(),
            likes: publication.likes,
            liked: this.likedPublicationIds().has(publication.id),
            comments: publication.comentarios,
            art: 'underworld' as const,
          };
        });

        this.posts.set(publicacionesDeLaPagina);
        for (const publicacion of publicacionesDeLaPagina) {
          this.cargarComentariosSiHaceFalta(String(publicacion.id));
        }
        this.paginaActual.set(result.pagina);
        this.loadingFeed.set(false);
        this.totalPublications.set(result.total);
        this.paginasTotales.set(Math.max(1, result.paginasTotales));
      },
      error: () => {
        if (requestVersion !== this.feedRequestVersion) {
          return;
        }

        this.feedError.set('No se pudieron cargar las publicaciones. Volvé a intentar.');
        this.loadingFeed.set(false);
      },
    });
  }

  private formatearTiempo(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) {
      return 'ahora';
    }
    if (minutes < 60) {
      return `hace ${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `hace ${hours} h`;
    }
    return `hace ${Math.floor(hours / 24)} d`;
  }

  protected cambiarOrden(mode: FeedSort): void {
    if (this.sortMode() === mode) {
      return;
    }

    this.sortMode.set(mode);
    this.reiniciarFeed();
  }

  private reiniciarFeed(): void {
    this.feedRequestVersion++;
    this.loadingFeed.set(false);
    this.feedError.set('');
    this.paginaActual.set(1);
    this.paginasTotales.set(1);
    this.posts.set([]);
    this.commentsByPost.set({});
    this.paginaComentariosPorPublicacion.set({});
    this.paginasTotalesComentarios.set({});
    this.totalPublications.set(0);
    this.cargarPagina(1);
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }

  protected actualizarFiltroUsuario(event: Event): void {
    const campo = event.target;
    if (!(campo instanceof HTMLInputElement)) {
      return;
    }

    this.authorFilter.set(campo.value);

    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = setTimeout(
      () => this.reiniciarFeed(),
      this.esperaBusquedaMs,
    );
  }

  protected estaProcesandoMeGusta(postId: number | string): boolean {
    return this.pendingLikes().has(String(postId));
  }

  protected esPublicacionPropia(post: FeedPost): boolean {
    return !!this.currentUserId() && post.authorId === this.currentUserId();
  }

  protected estaConfirmandoEliminacion(postId: number | string): boolean {
    return this.confirmDeleteId() === String(postId);
  }

  protected estaEliminandoPublicacion(postId: number | string): boolean {
    return this.deletingPostId() === String(postId);
  }

  protected solicitarEliminacion(postId: number | string): void {
    this.deleteError.set('');
    this.confirmDeleteId.set(String(postId));
  }

  protected cancelarEliminacion(): void {
    this.confirmDeleteId.set('');
  }

  protected obtenerComentarios(postId: number | string): PublicationComment[] {
    return this.commentsByPost()[String(postId)] ?? [];
  }

  protected estanCargandoComentarios(postId: number | string): boolean {
    return this.commentsLoading().has(String(postId));
  }

  protected hayMasComentarios(postId: number | string): boolean {
    const id = String(postId);
    const paginaActual = this.paginaComentariosPorPublicacion()[id] ?? 0;
    const paginasTotales = this.paginasTotalesComentarios()[id] ?? 0;

    return paginaActual < paginasTotales;
  }

  protected seEstaEnviandoComentario(postId: number | string): boolean {
    return this.commentsSubmitting().has(String(postId));
  }

  protected textoComentario(postId: number | string): string {
    return this.borradoresComentario()[String(postId)] ?? '';
  }

  protected actualizarBorradorComentario(postId: number | string, event: Event): void {
    const campo = event.target;
    if (!(campo instanceof HTMLTextAreaElement)) {
      return;
    }
    const id = String(postId);
    this.guardarBorradorComentario(id, campo.value);
  }

  protected actualizarTextoComentario(postId: number | string, texto: string): void {
    const id = String(postId);
    this.guardarBorradorComentario(id, texto);
  }

  private guardarBorradorComentario(id: string, texto: string): void {
    this.borradoresComentario.update((borradores) => ({ ...borradores, [id]: texto }));
  }

  protected errorComentario(postId: number | string): string {
    return this.commentErrors()[String(postId)] ?? '';
  }

  protected puedeEditarComentario(comment: PublicationComment): boolean {
    return !!this.currentUserId() && comment.autor?.id === this.currentUserId();
  }

  protected iniciarEdicionComentario(comment: PublicationComment): void {
    this.comentarioEnEdicion.set(comment.id);
    this.textoEdicionComentario.set(comment.mensaje);
  }

  protected cambiarTextoEdicionComentario(event: Event): void {
    const campo = event.target;
    if (!(campo instanceof HTMLTextAreaElement)) {
      return;
    }
    this.textoEdicionComentario.set(campo.value);
  }

  protected cancelarEdicionComentario(): void {
    this.comentarioEnEdicion.set('');
    this.textoEdicionComentario.set('');
  }

  protected guardarEdicionComentario(postId: number | string, comment: PublicationComment): void {
    const mensaje = this.textoEdicionComentario().trim();
    if (!mensaje || !this.puedeEditarComentario(comment)) {
      return;
    }
    this.publicationsService.editarComentario(String(postId), comment.id, mensaje).subscribe({
      next: (comentarioActualizado) => {
        const id = String(postId);
        this.commentsByPost.update((actuales) => ({
          ...actuales,
          [id]: (actuales[id] ?? []).map((comentario) =>
            comentario.id === comment.id ? comentarioActualizado : comentario),
        }));
        this.cancelarEdicionComentario();
      },
      error: () => this.guardarErrorComentario(String(postId), 'No se pudo editar el comentario.'),
    });
  }

  protected horaComentario(value: string): string {
    return this.formatearTiempo(value);
  }

  protected abrirDetallePublicacion(post: FeedPost): void {
    this.selectedPost.set({
      id: post.id,
      title: post.title,
      message: post.message,
      imageUrl: post.imageUrl,
      game: post.game,
      author: post.author,
      handle: post.handle,
      initials: post.initials,
      likes: post.likes,
      comments: post.comments,
      timeLabel: post.timeLabel,
    });
    this.cargarComentariosSiHaceFalta(String(post.id));
  }

  protected cerrarDetallePublicacion(): void {
    this.selectedPost.set(null);
  }

  private cargarComentariosSiHaceFalta(id: string): void {
    if (this.commentsByPost()[id] !== undefined || this.estanCargandoComentarios(id)) {
      return;
    }

    this.cargarPaginaComentarios(id, 1);
  }

  protected cargarMasComentarios(postId: number | string): void {
    const id = String(postId);
    if (!this.hayMasComentarios(id) || this.estanCargandoComentarios(id)) {
      return;
    }

    const paginaSiguiente = (this.paginaComentariosPorPublicacion()[id] ?? 0) + 1;
    this.cargarPaginaComentarios(id, paginaSiguiente);
  }

  private cargarPaginaComentarios(id: string, pagina: number): void {
    this.cambiarCargaComentarios(id, true);
    this.publicationsService.listarComentarios(id, pagina, this.comentariosPorPagina).subscribe({
      next: (resultado) => {
        const comentariosAnteriores = this.commentsByPost()[id] ?? [];
        const idsAnteriores = new Set(comentariosAnteriores.map((comment) => comment.id));
        const comentariosNuevos = resultado.items.filter((comment) => !idsAnteriores.has(comment.id));

        this.commentsByPost.update((current) => ({
          ...current,
          [id]: [...(current[id] ?? []), ...comentariosNuevos],
        }));
        this.paginaComentariosPorPublicacion.update((current) => ({
          ...current,
          [id]: resultado.pagina,
        }));
        this.paginasTotalesComentarios.update((current) => ({
          ...current,
          [id]: resultado.paginasTotales,
        }));
        this.posts.update((posts) => posts.map((post) => String(post.id) === id
          ? { ...post, comments: resultado.total }
          : post));
        this.selectedPost.update((post) => post && String(post.id) === id
          ? { ...post, comments: resultado.total }
          : post);
        this.guardarErrorComentario(id, '');
      },
      error: () => {
        this.guardarErrorComentario(id, 'No se pudieron cargar los comentarios.');
        this.cambiarCargaComentarios(id, false);
      },
      complete: () => this.cambiarCargaComentarios(id, false),
    });
  }

  protected enviarComentario(postId: number | string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const id = String(postId);
    const message = this.textoComentario(id).trim();
    if (!message || this.seEstaEnviandoComentario(id)) {
      return;
    }
    this.guardarErrorComentario(id, '');
    this.cambiarCargaEnvioComentario(id, true);
    this.publicationsService.crearComentario(id, message).subscribe({
      next: (comment) => {
        this.commentsByPost.update((current) => ({
          ...current,
          [id]: [comment, ...(current[id] ?? [])],
        }));
        this.borradoresComentario.update((borradores) => ({ ...borradores, [id]: '' }));
        let totalComentarios = 0;
        this.posts.update((posts) => posts.map((post) => {
          if (String(post.id) !== id) {
            return post;
          }

          totalComentarios = post.comments + 1;
          return { ...post, comments: totalComentarios };
        }));
        const totalPaginas = Math.ceil(totalComentarios / this.comentariosPorPagina);
        this.paginasTotalesComentarios.update((current) => ({ ...current, [id]: totalPaginas }));
        this.selectedPost.update((post) => post && String(post.id) === id
          ? { ...post, comments: totalComentarios }
          : post);
      },
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.message;
        if (Array.isArray(detail)) {
          this.guardarErrorComentario(id, detail.join(' '));
        } else if (typeof detail === 'string') {
          this.guardarErrorComentario(id, detail);
        } else {
          this.guardarErrorComentario(id, 'No se pudo enviar el comentario.');
        }
        this.cambiarCargaEnvioComentario(id, false);
      },
      complete: () => this.cambiarCargaEnvioComentario(id, false),
    });
  }

  private cambiarCargaEnvioComentario(id: string, enviando: boolean): void {
    this.commentsSubmitting.update((actuales) => {
      const nuevos = new Set(actuales);
      if (enviando) {
        nuevos.add(id);
      } else {
        nuevos.delete(id);
      }
      return nuevos;
    });
  }

  private cambiarCargaComentarios(id: string, loading: boolean): void {
    this.commentsLoading.update((current) => {
      const next = new Set(current);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  private guardarErrorComentario(id: string, message: string): void {
    this.commentErrors.update((current) => ({ ...current, [id]: message }));
  }

  protected eliminarPublicacion(postId: number | string): void {
    const id = String(postId);
    const post = this.posts().find((candidate) => String(candidate.id) === id);

    if (this.loadingFeed()) {
      return;
    }

    if (this.deletingPostId()) {
      return;
    }

    if (!post) {
      return;
    }

    if (!this.esPublicacionPropia(post)) {
      return;
    }

    this.deleteError.set('');
    this.deletingPostId.set(id);
    this.publicationsService.eliminarPublicacion(id).subscribe({
      next: () => {
        const totalLuegoDeEliminar = Math.max(0, this.totalPublications() - 1);
        const paginasLuegoDeEliminar = Math.max(
          1,
          Math.ceil(totalLuegoDeEliminar / this.publicacionesPorPagina),
        );
        let paginaACargar = this.paginaActual();

        if (paginaACargar > paginasLuegoDeEliminar) {
          paginaACargar = paginasLuegoDeEliminar;
        }

        this.totalPublications.set(totalLuegoDeEliminar);
        this.paginasTotales.set(paginasLuegoDeEliminar);
        this.posts.set([]);
        this.confirmDeleteId.set('');
        this.deletingPostId.set('');
        this.cargarPagina(paginaACargar);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.deleteError.set('Solo podés eliminar tus propias publicaciones.');
        } else if (error.status === 401) {
          this.deleteError.set('Iniciá sesión para eliminar una publicación.');
        } else {
          this.deleteError.set('No se pudo eliminar la publicación. Intentá otra vez.');
        }

        this.deletingPostId.set('');
        this.confirmDeleteId.set('');
      },
    });
  }

  protected alternarMeGusta(postId: number | string): void {
    const id = String(postId);
    const post = this.posts().find((candidate) => String(candidate.id) === id);
    if (this.estaProcesandoMeGusta(id) || !post) {
      return;
    }

    this.likeError.set('');
    this.pendingLikes.update((ids) => new Set(ids).add(id));
    const request = post.liked
      ? this.publicationsService.quitarMeGusta(id)
      : this.publicationsService.agregarMeGusta(id);
    request.subscribe({
      next: ({ liked, likes }) => {
        this.posts.update((posts) => posts.map((post) => post.id === postId ? { ...post, liked, likes } : post));
      },
      error: (error: HttpErrorResponse) => {
        this.likeError.set(error.status === 401
          ? 'Iniciá sesión para marcar Me gusta.'
          : 'No se pudo actualizar el Me gusta. Intentá otra vez.');
        this.finalizarMeGusta(id);
      },
      complete: () => this.finalizarMeGusta(id),
    });
  }

  private finalizarMeGusta(id: string): void {
    this.pendingLikes.update((pending) => {
      const next = new Set(pending);
      next.delete(id);
      return next;
    });
  }

  protected seleccionarImagen(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const image = input?.files?.[0];
    this.publishError.set('');
    if (!image) {
      this.selectedImage.set(null);
      this.imageName.set('');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      this.publishError.set('La imagen debe ser JPG, PNG o WEBP.');
      if (input) {
        input.value = '';
      }
      return;
    }
    if (image.size > 25 * 1024 * 1024) {
      this.publishError.set('La imagen debe pesar 25 MB o menos.');
      if (input) {
        input.value = '';
      }
      return;
    }
    this.selectedImage.set(image);
    this.imageName.set(image.name);
  }

  protected crearPublicacion(event: Event): void {
    event.preventDefault();

    void submit(this.formularioPublicacion, async () => {
      const datos = this.datosPublicacion();
      const title = datos.titulo.trim();
      const description = datos.descripcion.trim();
      this.publishError.set('');

      try {
        const publication = await firstValueFrom(
          this.publicationsService.crearPublicacion(title, description, this.selectedImage() ?? undefined),
        );
        const now = new Date(publication.createdAt).getTime() || Date.now();
        this.posts.update((posts) => [
          {
            id: publication.id,
            authorId: publication.autor.id,
            author: `${publication.autor.nombre} ${publication.autor.apellido}`.trim(),
            handle: publication.autor.nombreUsuario,
            initials: `${publication.autor.nombre[0] ?? ''}${publication.autor.apellido[0] ?? ''}`.toUpperCase(),
            avatarTone: 'stone',
            game: 'Mi partida',
            title: publication.titulo,
            message: publication.descripcion,
            imageUrl: publication.imagenUrl,
            timeLabel: 'ahora',
            createdAt: now,
            likes: 0,
            liked: false,
            comments: 0,
            art: 'underworld',
          },
          ...posts,
        ]);
        this.datosPublicacion.set({ titulo: '', descripcion: '' });
        this.formularioPublicacion().reset();
        this.selectedImage.set(null);
        this.imageName.set('');
        this.authorFilter.set('');
        this.sortMode.set('recent');
        this.composerOpen.set(false);
      } catch (error) {
        if (error instanceof HttpErrorResponse) {
          const detail = error.error?.message;
          if (Array.isArray(detail)) {
            this.publishError.set(detail.join(' '));
            return;
          }

          if (typeof detail === 'string') {
            this.publishError.set(detail);
            return;
          }
        }

        this.publishError.set('No se pudo publicar. Volvé a intentarlo.');
      }
    });
  }
}
