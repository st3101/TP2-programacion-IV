import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PublicationComment } from '../../auth/publications.service';

export interface PublicationDetailPost {
  id: number | string;
  title: string;
  message: string;
  imageUrl?: string;
  game: string;
  author: string;
  handle: string;
  initials: string;
  likes: number;
  comments: number;
  timeLabel: string;
}

@Component({
  selector: 'app-publication-detail-modal',
  templateUrl: './publication-detail-modal.component.html',
  styleUrl: './publication-detail-modal.component.css',
})
export class PublicationDetailModalComponent {
  @Input({ required: true }) post!: PublicationDetailPost;
  @Input() comments: PublicationComment[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() draft = '';
  @Input() submitting = false;

  @Output() closed = new EventEmitter<void>();
  @Output() commentSubmitted = new EventEmitter<void>();
  @Output() draftChanged = new EventEmitter<string>();

  protected updateDraft(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLTextAreaElement) this.draftChanged.emit(input.value);
  }

  protected commentTime(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }
}
