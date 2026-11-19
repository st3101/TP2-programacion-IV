import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-publication-comment-form',
  templateUrl: './publication-comment-form.component.html',
  styleUrl: './publication-comment-form.component.css',
})
export class PublicationCommentFormComponent {
  @Input() id = '';
  @Input() texto = '';
  @Input() enviando = false;

  @Output() textoCambiado = new EventEmitter<string>();
  @Output() enviado = new EventEmitter<void>();

  protected enviar(event: Event): void {
    event.preventDefault();
    this.enviado.emit();
  }

  protected cambiarTexto(event: Event): void {
    const campo = event.target;
    if (campo instanceof HTMLTextAreaElement) {
      this.textoCambiado.emit(campo.value);
    }
  }
}
