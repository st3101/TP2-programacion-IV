import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-publication-card',
  templateUrl: './publication-card.component.html',
  styleUrl: './publication-card.component.css',
})
export class PublicationCardComponent {
  @Input() variant: 'feed' | 'profile' = 'feed';
  @Input() id: number | string = '';
  @Input() title = '';
  @Input() description = '';
  @Input() author = '';
  @Input() handle = '';
  @Input() initials = '';
  @Input() avatarTone: 'ember' | 'stone' | 'plum' = 'stone';
  @Input() game = 'Comunidad';
  @Input() timeLabel = '';
  @Input() imageUrl = '';
  @Input() art: 'underworld' | 'afterlight' | 'newdawn' = 'underworld';

  @Output() detailsRequested = new EventEmitter<void>();

  protected openDetails(): void {
    this.detailsRequested.emit();
  }
}
