import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { MyProfileResponse, ProfileService } from '../../auth/profile.service';
import { PublicationComment } from '../../auth/publications.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PublicationDetailModalComponent, PublicationDetailPost } from '../../shared/publication-detail-modal/publication-detail-modal.component';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, RouterLink, NavbarComponent, PublicationDetailModalComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css',
})
export class ProfilePageComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly profile = signal<MyProfileResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly message = signal('');
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly selectedImageName = signal('');
  protected readonly selectedPublication = signal<{ post: PublicationDetailPost; comments: PublicationComment[] } | null>(null);

  ngOnInit(): void {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.profileService.getMyProfile().subscribe({
      next: (profile) => this.profile.set(profile),
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
    if (!user) return;
    this.selectedPublication.set({
      post: {
        id: post.id,
        title: post.titulo,
        message: post.descripcion,
        imageUrl: post.imagenUrl || undefined,
        game: 'Comunidad',
        author: `${user.nombre} ${user.apellido}`,
        handle: user.nombreUsuario,
        initials: this.initials(user.nombre, user.apellido),
        likes: 0,
        comments: post.comentarios.length,
        timeLabel: new Date(post.createdAt).toLocaleString('es-AR'),
      },
      comments: post.comentarios.map((comment) => ({
        ...comment,
        autor: { ...comment.autor, imagenPerfilUrl: '' },
      })),
    });
  }

  protected closePublication(): void {
    this.selectedPublication.set(null);
  }

  protected dateInput(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  protected startEditing(): void {
    this.message.set('');
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

  protected saveProfile(event: SubmitEvent): void {
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement)) return;

    const formData = new FormData(event.target);
    const currentProfile = this.profile()?.usuario;
    if (!currentProfile) return;

    this.saving.set(true);
    this.message.set('');
    this.profileService
      .updateMyProfile({
        nombre: String(formData.get('nombre') ?? ''),
        apellido: String(formData.get('apellido') ?? ''),
        nombreUsuario: String(formData.get('nombreUsuario') ?? ''),
        fechaNacimiento: String(formData.get('fechaNacimiento') ?? ''),
        descripcion: String(formData.get('descripcion') ?? ''),
      }, this.selectedImage() ?? undefined)
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.editing.set(false);
          this.selectedImage.set(null);
          this.selectedImageName.set('');
          this.message.set('Perfil actualizado.');
        },
        error: (error: HttpErrorResponse) => {
          const detail = error.error?.message;
          this.message.set(
            Array.isArray(detail)
              ? detail.join(' ')
              : typeof detail === 'string'
                ? detail
                : 'No se pudo guardar el perfil. Intentá de nuevo.',
          );
          this.saving.set(false);
        },
        complete: () => this.saving.set(false),
      });
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
