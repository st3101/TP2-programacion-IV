import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
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
export class FeedPageComponent {
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
  protected readonly posts = signal<FeedPost[]>([
    {
      id: 1,
      author: 'Mora Castillo',
      handle: 'mora.exe',
      initials: 'MC',
      avatarTone: 'ember',
      game: 'Hades II',
      title: 'Una corrida más y me voy. Sí, claro.',
      message:
        'Me armé una build de dagas y salió muchísimo mejor de lo esperado. La pelea con Hécate estuvo por un pelo. ¿Qué arma están usando ustedes?',
      timeLabel: 'hace 12 min',
      createdAt: Date.now() - 12 * 60_000,
      likes: 28,
      liked: false,
      comments: 8,
      art: 'underworld',
    },
    {
      id: 2,
      author: 'Nico Pereyra',
      handle: 'nicopixel',
      initials: 'NP',
      avatarTone: 'stone',
      game: 'Hollow Knight',
      title: 'Por fin encontré el camino.',
      message:
        'Tres horas dando vueltas para descubrir que la entrada estaba justo donde ya había pasado. El mapa no perdona, pero qué lindo se siente encontrar una zona nueva.',
      timeLabel: 'hace 46 min',
      createdAt: Date.now() - 46 * 60_000,
      likes: 17,
      liked: true,
      comments: 5,
      art: 'afterlight',
    },
    {
      id: 3,
      author: 'Luz Benítez',
      handle: 'luzjuega',
      initials: 'LB',
      avatarTone: 'plum',
      game: 'Stardew Valley',
      title: 'Año 3 y todavía no me canso de esta granja.',
      message:
        'Hoy terminé el invernadero y organicé todo por estaciones. Les dejo un vistazo a mi rincón favorito: el bosque cuando cae la tarde.',
      timeLabel: 'hace 2 h',
      createdAt: Date.now() - 2 * 60 * 60_000,
      likes: 42,
      liked: false,
      comments: 13,
      art: 'newdawn',
    },
    {
      id: 4,
      author: 'Mora Castillo',
      handle: 'mora.exe',
      initials: 'MC',
      avatarTone: 'ember',
      game: 'Celeste',
      title: 'Una pantalla difícil, muchas ganas de seguir.',
      message:
        'Me quedé trabada un buen rato, respiré y salió. A veces el mejor logro es no soltar el control.',
      timeLabel: 'hace 5 h',
      createdAt: Date.now() - 5 * 60 * 60_000,
      likes: 31,
      liked: false,
      comments: 4,
      art: 'afterlight',
    },
  ]);

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
    if (input instanceof HTMLInputElement) this.draft.set(input.value);
  }

  protected toggleLike(postId: number | string): void {
    this.posts.update((posts) =>
      posts.map((post) =>
        post.id === postId
          ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
          : post,
      ),
    );
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
    if (image.size > 5 * 1024 * 1024) {
      this.publishError.set('La imagen debe pesar 5 MB o menos.');
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
            author: 'Mi cuenta',
            handle: 'mi-cuenta',
            initials: 'MC',
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
