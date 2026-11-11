import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ProfileService } from '../../auth/profile.service';
import { PublicationComment, PublicationsService } from '../../auth/publications.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PublicationDetailModalComponent } from '../../shared/publication-detail-modal/publication-detail-modal.component';

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
  imports: [NavbarComponent, PublicationDetailModalComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements AfterViewInit, OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly publicationsService = inject(PublicationsService);
  private readonly profileService = inject(ProfileService);
  protected readonly sortMode = signal<FeedSort>('recent');
  protected readonly authorFilter = signal('');
  protected readonly draft = signal('');
  protected readonly titleDraft = signal('');
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imageName = signal('');
  protected readonly publishing = signal(false);
  protected readonly publishError = signal('');
  protected readonly feedError = signal('');
  protected readonly loadingFeed = signal(false);
  protected readonly hasMore = signal(true);
  protected readonly totalPublications = signal(0);
  protected readonly likeError = signal('');
  protected readonly deleteError = signal('');
  protected readonly pendingLikes = signal<ReadonlySet<string>>(new Set());
  protected readonly composerOpen = signal(false);
  protected readonly posts = signal<FeedPost[]>([]);
  protected readonly selectedPost = signal<FeedPost | null>(null);
  protected readonly currentUserId = signal('');
  protected readonly confirmDeleteId = signal('');
  protected readonly deletingPostId = signal('');
  protected readonly openCommentThreads = signal<ReadonlySet<string>>(new Set());
  protected readonly commentsByPost = signal<Record<string, PublicationComment[]>>({});
  protected readonly commentDrafts = signal<Record<string, string>>({});
  protected readonly commentsLoading = signal<ReadonlySet<string>>(new Set());
  protected readonly commentsSubmitting = signal<ReadonlySet<string>>(new Set());
  protected readonly commentErrors = signal<Record<string, string>>({});
  private readonly pageSize = 5;
  private offset = 0;
  private feedRequestVersion = 0;
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private readonly likedPublicationIds = signal<ReadonlySet<string>>(new Set());
  private observer?: IntersectionObserver;

  @ViewChild('feedSentinel') private feedSentinel?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.loadNextPage();
    this.profileService.getMyProfile().subscribe({
      next: ({ usuario }) => this.currentUserId.set(usuario.id),
    });
    this.publicationsService.myLikes().subscribe({
      next: ({ publicacionIds }) => {
        const likedIds = new Set(publicacionIds);
        this.likedPublicationIds.set(likedIds);
        this.posts.update((posts) => posts.map((post) => ({ ...post, liked: likedIds.has(String(post.id)) })));
      },
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.loadNextPage();
      },
      { rootMargin: '600px 0px' },
    );
    if (this.feedSentinel) this.observer.observe(this.feedSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  protected loadNextPage(): void {
    if (this.loadingFeed() || !this.hasMore()) return;

    this.loadingFeed.set(true);
    this.feedError.set('');
    const requestVersion = this.feedRequestVersion;
    const username = this.authorFilter().trim() || undefined;
    const order = this.sortMode() === 'popular' ? 'me-gusta' : 'fecha';
    this.publicationsService.list(this.offset, this.pageSize, order, username).subscribe({
      next: (result) => {
        if (requestVersion !== this.feedRequestVersion) return;
        const currentIds = new Set(this.posts().map((post) => String(post.id)));
        const newPosts = result.items
          .filter((publication) => !currentIds.has(publication.id))
          .map((publication, index) => {
            const author = publication.autor;
            const name = `${author?.nombre ?? ''} ${author?.apellido ?? ''}`.trim();
            const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
            return {
              id: publication.id,
              authorId: author?.id ?? '',
              author: name || author?.nombreUsuario || 'Jugador',
              handle: author?.nombreUsuario || 'jugador',
              initials,
              avatarTone: (['ember', 'stone', 'plum'] as const)[(this.posts().length + index) % 3],
              game: 'Comunidad' as const,
              title: publication.titulo,
              message: publication.descripcion,
              imageUrl: publication.imagenUrl || undefined,
              timeLabel: this.formatTime(publication.createdAt),
              createdAt: new Date(publication.createdAt).getTime() || Date.now(),
              likes: publication.likes,
              liked: this.likedPublicationIds().has(publication.id),
              comments: publication.comentarios,
              art: 'underworld' as const,
            };
          });
        this.posts.update((posts) => [...posts, ...newPosts]);
        this.offset += result.items.length;
        this.hasMore.set(result.hasMore);
        this.loadingFeed.set(false);
        this.totalPublications.set(result.total);
        if (result.hasMore && this.feedSentinel && this.observer) {
          this.observer.unobserve(this.feedSentinel.nativeElement);
          this.observer.observe(this.feedSentinel.nativeElement);
        }
      },
      error: () => {
        if (requestVersion !== this.feedRequestVersion) return;
        this.feedError.set('No se pudieron cargar las publicaciones. Volvé a intentar.');
        this.loadingFeed.set(false);
      },
    });
  }

  private formatTime(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }

  protected readonly visiblePosts = computed(() => {
    return this.posts().slice().sort((first, second) =>
      this.sortMode() === 'popular'
        ? second.likes - first.likes || second.createdAt - first.createdAt
        : second.createdAt - first.createdAt,
    );
  });

  protected setSort(mode: FeedSort): void {
    if (this.sortMode() === mode) return;
    this.sortMode.set(mode);
    this.resetFeed();
  }

  private resetFeed(): void {
    this.feedRequestVersion++;
    this.loadingFeed.set(false);
    this.feedError.set('');
    this.offset = 0;
    this.posts.set([]);
    this.totalPublications.set(0);
    this.hasMore.set(true);
    this.loadNextPage();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }

  protected updateAuthorFilter(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.authorFilter.set(input.value);
      if (this.searchDebounce) clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => this.resetFeed(), 300);
    }
  }

  protected updateDraft(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLTextAreaElement) this.draft.set(input.value);
  }

  protected isLikePending(postId: number | string): boolean {
    return this.pendingLikes().has(String(postId));
  }

  protected isOwnPost(post: FeedPost): boolean {
    return !!this.currentUserId() && post.authorId === this.currentUserId();
  }

  protected isConfirmingDelete(postId: number | string): boolean {
    return this.confirmDeleteId() === String(postId);
  }

  protected isDeletingPost(postId: number | string): boolean {
    return this.deletingPostId() === String(postId);
  }

  protected requestDelete(postId: number | string): void {
    this.deleteError.set('');
    this.confirmDeleteId.set(String(postId));
  }

  protected cancelDelete(): void {
    this.confirmDeleteId.set('');
  }

  protected isCommentThreadOpen(postId: number | string): boolean {
    return this.openCommentThreads().has(String(postId));
  }

  protected commentsFor(postId: number | string): PublicationComment[] {
    return this.commentsByPost()[String(postId)] ?? [];
  }

  protected isCommentsLoading(postId: number | string): boolean {
    return this.commentsLoading().has(String(postId));
  }

  protected isCommentSubmitting(postId: number | string): boolean {
    return this.commentsSubmitting().has(String(postId));
  }

  protected commentText(postId: number | string): string {
    return this.commentDrafts()[String(postId)] ?? '';
  }

  protected commentError(postId: number | string): string {
    return this.commentErrors()[String(postId)] ?? '';
  }

  protected commentTime(value: string): string {
    return this.formatTime(value);
  }

  protected openPostDetails(post: FeedPost): void {
    this.selectedPost.set(post);
    this.ensureCommentsLoaded(String(post.id));
  }

  protected closePostDetails(): void {
    this.selectedPost.set(null);
  }

  protected toggleCommentThread(postId: number | string): void {
    const id = String(postId);
    const open = new Set(this.openCommentThreads());
    if (open.has(id)) {
      open.delete(id);
      this.openCommentThreads.set(open);
      return;
    }

    open.add(id);
    this.openCommentThreads.set(open);
    this.ensureCommentsLoaded(id);
  }

  private ensureCommentsLoaded(id: string): void {
    if (this.commentsByPost()[id] !== undefined || this.isCommentsLoading(id)) return;
    this.setCommentLoading(id, true);
    this.publicationsService.listComments(id).subscribe({
      next: (comments) => {
        this.commentsByPost.update((current) => ({ ...current, [id]: comments }));
        this.posts.update((posts) => posts.map((post) => String(post.id) === id ? { ...post, comments: comments.length } : post));
        this.selectedPost.update((post) => post && String(post.id) === id
          ? { ...post, comments: comments.length }
          : post);
        this.setCommentError(id, '');
      },
      error: () => {
        this.setCommentError(id, 'No se pudieron cargar los comentarios.');
        this.setCommentLoading(id, false);
      },
      complete: () => this.setCommentLoading(id, false),
    });
  }

  protected updateCommentDraft(postId: number | string, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement)) return;
    this.setCommentDraft(postId, input.value);
  }

  protected setCommentDraft(postId: number | string, value: string): void {
    const id = String(postId);
    this.commentDrafts.update((drafts) => ({ ...drafts, [id]: value }));
  }

  protected submitComment(postId: number | string): void {
    const id = String(postId);
    const message = this.commentText(id).trim();
    if (!message || this.isCommentSubmitting(id)) return;

    this.setCommentError(id, '');
    this.setCommentSubmitting(id, true);
    this.publicationsService.createComment(id, message).subscribe({
      next: (comment) => {
        this.commentsByPost.update((current) => ({ ...current, [id]: [...(current[id] ?? []), comment] }));
        this.commentDrafts.update((drafts) => ({ ...drafts, [id]: '' }));
        this.posts.update((posts) => posts.map((post) => String(post.id) === id
          ? { ...post, comments: post.comments + 1 }
          : post));
        this.selectedPost.update((post) => post && String(post.id) === id
          ? { ...post, comments: post.comments + 1 }
          : post);
      },
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.message;
        this.setCommentError(id, Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : 'No se pudo enviar el comentario.');
        this.setCommentSubmitting(id, false);
      },
      complete: () => this.setCommentSubmitting(id, false),
    });
  }

  private setCommentLoading(id: string, loading: boolean): void {
    this.commentsLoading.update((current) => {
      const next = new Set(current);
      loading ? next.add(id) : next.delete(id);
      return next;
    });
  }

  private setCommentSubmitting(id: string, submitting: boolean): void {
    this.commentsSubmitting.update((current) => {
      const next = new Set(current);
      submitting ? next.add(id) : next.delete(id);
      return next;
    });
  }

  private setCommentError(id: string, message: string): void {
    this.commentErrors.update((current) => ({ ...current, [id]: message }));
  }

  protected deletePost(postId: number | string): void {
    const id = String(postId);
    const post = this.posts().find((candidate) => String(candidate.id) === id);
    if (this.loadingFeed() || this.deletingPostId() || !post || !this.isOwnPost(post)) return;

    this.deleteError.set('');
    this.deletingPostId.set(id);
    this.publicationsService.delete(id).subscribe({
      next: () => {
        this.posts.update((posts) => posts.filter((post) => String(post.id) !== id));
        this.totalPublications.update((total) => Math.max(0, total - 1));
        this.confirmDeleteId.set('');
        this.offset = Math.max(0, this.offset - this.pageSize);
        this.hasMore.set(true);
        this.deletingPostId.set('');
        this.loadNextPage();
      },
      error: (error: HttpErrorResponse) => {
        this.deleteError.set(error.status === 403
          ? 'Solo podés eliminar tus propias publicaciones.'
          : error.status === 401
            ? 'Iniciá sesión para eliminar una publicación.'
            : 'No se pudo eliminar la publicación. Intentá otra vez.');
        this.deletingPostId.set('');
        this.confirmDeleteId.set('');
      },
    });
  }

  protected toggleLike(postId: number | string): void {
    const id = String(postId);
    const post = this.posts().find((candidate) => String(candidate.id) === id);
    if (this.isLikePending(id) || !post) return;

    this.likeError.set('');
    this.pendingLikes.update((ids) => new Set(ids).add(id));
    const request = post.liked
      ? this.publicationsService.removeLike(id)
      : this.publicationsService.addLike(id);
    request.subscribe({
      next: ({ liked, likes }) => {
        this.posts.update((posts) => posts.map((post) => post.id === postId ? { ...post, liked, likes } : post));
      },
      error: (error: HttpErrorResponse) => {
        this.likeError.set(error.status === 401
          ? 'Iniciá sesión para marcar Me gusta.'
          : 'No se pudo actualizar el Me gusta. Intentá otra vez.');
        this.clearPendingLike(id);
      },
      complete: () => this.clearPendingLike(id),
    });
  }

  private clearPendingLike(id: string): void {
    this.pendingLikes.update((pending) => {
      const next = new Set(pending);
      next.delete(id);
      return next;
    });
  }

  protected updateTitle(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) this.titleDraft.set(input.value);
  }

  protected onImageSelected(event: Event): void {
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
      if (input) input.value = '';
      return;
    }
    if (image.size > 25 * 1024 * 1024) {
      this.publishError.set('La imagen debe pesar 25 MB o menos.');
      if (input) input.value = '';
      return;
    }
    this.selectedImage.set(image);
    this.imageName.set(image.name);
  }

  protected publish(): void {
    const title = this.titleDraft().trim();
    const description = this.draft().trim();
    if (!title || !description || this.publishing()) return;

    this.publishing.set(true);
    this.publishError.set('');
    this.publicationsService.create(title, description, this.selectedImage() ?? undefined).subscribe({
      next: (publication) => {
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
        this.titleDraft.set('');
        this.draft.set('');
        this.selectedImage.set(null);
        this.imageName.set('');
        this.authorFilter.set('');
        this.sortMode.set('recent');
        this.composerOpen.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.message;
        this.publishError.set(
          Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : 'No se pudo publicar. Volvé a intentarlo.',
        );
        this.publishing.set(false);
      },
      complete: () => this.publishing.set(false),
    });
  }
}
