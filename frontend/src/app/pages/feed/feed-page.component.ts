import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { PublicationsService } from '../../auth/publications.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

type FeedSort = 'recent' | 'popular';

interface FeedPost {
  id: number | string;
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
  imports: [NavbarComponent],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent implements AfterViewInit, OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly publicationsService = inject(PublicationsService);
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
  protected readonly pendingLikes = signal<ReadonlySet<string>>(new Set());
  protected readonly composerOpen = signal(false);
  protected readonly posts = signal<FeedPost[]>([]);
  private readonly pageSize = 5;
  private page = 1;
  private readonly likedPublicationIds = signal<ReadonlySet<string>>(new Set());
  private observer?: IntersectionObserver;

  @ViewChild('feedSentinel') private feedSentinel?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.loadNextPage();
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
  }

  protected loadNextPage(): void {
    if (this.loadingFeed() || !this.hasMore()) return;

    this.loadingFeed.set(true);
    this.feedError.set('');
    this.publicationsService.list(this.page, this.pageSize).subscribe({
      next: (result) => {
        const currentIds = new Set(this.posts().map((post) => String(post.id)));
        const newPosts = result.items
          .filter((publication) => !currentIds.has(publication.id))
          .map((publication, index) => {
            const author = publication.autor;
            const name = `${author?.nombre ?? ''} ${author?.apellido ?? ''}`.trim();
            const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
            return {
              id: publication.id,
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
              comments: 0,
              art: 'underworld' as const,
            };
          });
        this.posts.update((posts) => [...posts, ...newPosts]);
        this.page = result.page + 1;
        this.hasMore.set(result.hasMore);
        this.loadingFeed.set(false);
        this.totalPublications.set(result.total);
        if (result.hasMore && this.feedSentinel && this.observer) {
          this.observer.unobserve(this.feedSentinel.nativeElement);
          this.observer.observe(this.feedSentinel.nativeElement);
        }
      },
      error: () => {
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
    const query = this.authorFilter().trim().toLocaleLowerCase('es-AR');
    const filtered = this.posts().filter((post) => {
      const author = `${post.author} ${post.handle}`.toLocaleLowerCase('es-AR');
      return author.includes(query);
    });

    return filtered.sort((first, second) =>
      this.sortMode() === 'popular'
        ? second.likes - first.likes || second.createdAt - first.createdAt
        : second.createdAt - first.createdAt,
    );
  });

  protected setSort(mode: FeedSort): void {
    this.sortMode.set(mode);
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }

  protected updateAuthorFilter(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) this.authorFilter.set(input.value);
  }

  protected updateDraft(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLTextAreaElement) this.draft.set(input.value);
  }

  protected isLikePending(postId: number | string): boolean {
    return this.pendingLikes().has(String(postId));
  }

  protected toggleLike(postId: number | string): void {
    const id = String(postId);
    if (this.isLikePending(id)) return;

    this.likeError.set('');
    this.pendingLikes.update((ids) => new Set(ids).add(id));
    this.publicationsService.toggleLike(id).subscribe({
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
