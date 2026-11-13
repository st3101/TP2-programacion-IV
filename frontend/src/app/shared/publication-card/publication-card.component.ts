import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { PublicationComment } from '../../auth/publications.service';
import { FeedPost } from '../../pages/feed/feed-post.model';

@Component({
  selector: 'app-publication-card',
  templateUrl: './publication-card.component.html',
  styleUrl: './publication-card.component.css',
})
export class PublicationCardComponent {
  @Input({ required: true }) post!: FeedPost;
  @Input() currentUserId = '';
  @Input() likePending = false;
  @Input() confirmingDelete = false;
  @Input() deleting = false;
  @Input() loadingFeed = false;
  @Input() commentThreadOpen = false;
  @Input() comments: PublicationComment[] = [];
  @Input() commentsLoading = false;
  @Input() commentError = '';
  @Input() commentDraft = '';
  @Input() commentSubmitting = false;

  @Output() likeClicked = new EventEmitter<void>();
  @Output() commentsToggled = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() deleteCancelled = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<void>();
  @Output() detailsRequested = new EventEmitter<void>();
  @Output() commentDraftChanged = new EventEmitter<string>();
  @Output() commentSubmitted = new EventEmitter<void>();

  get isOwnPost(): boolean {
    return Boolean(this.currentUserId) && this.post.authorId === this.currentUserId;
  }

  get likeAriaLabel(): string {
    if (this.post.liked) {
      return 'Quitar Me gusta';
    }
    return 'Dar Me gusta';
  }

  get commentsAriaLabel(): string {
    let action = 'Ver';
    if (this.commentThreadOpen) {
      action = 'Ocultar';
    }
    return `${action} comentarios: ${this.post.comments}`;
  }

  commentAuthorName(comment: PublicationComment): string {
    if (comment.autor) {
      return `${comment.autor.nombre} ${comment.autor.apellido}`;
    }
    return 'Usuario';
  }

  formatTime(value: string): string {
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

  commentSubmitLabel(): string {
    if (this.commentSubmitting) {
      return 'Enviando...';
    }
    return 'Comentar';
  }

  deleteConfirmationLabel(): string {
    if (this.deleting) {
      return 'Eliminando...';
    }
    return 'Sí, eliminar';
  }

  onDraftInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLTextAreaElement) {
      this.commentDraftChanged.emit(input.value);
    }
  }

  openDetails(): void {
    this.detailsRequested.emit();
  }

  onMediaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.openDetails();
    }
    if (event.key === ' ') {
      event.preventDefault();
      this.openDetails();
    }
  }

  submitComment(event: SubmitEvent): void {
    event.preventDefault();
    this.commentSubmitted.emit();
  }
}
