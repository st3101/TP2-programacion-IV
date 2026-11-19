import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-date-filter',
  templateUrl: './admin-date-filter.component.html',
  styleUrl: './admin-date-filter.component.css',
})
export class AdminDateFilterComponent {
  @Input() fechaDesde = '';
  @Input() fechaHasta = '';
  @Input() textoBoton = 'Buscar';
  @Input() cargando = false;

  @Output() fechaDesdeChange = new EventEmitter<string>();
  @Output() fechaHastaChange = new EventEmitter<string>();
  @Output() buscar = new EventEmitter<void>();

  protected actualizarDesde(evento: Event): void {
    const campo = evento.target;
    if (campo instanceof HTMLInputElement) {
      this.fechaDesdeChange.emit(campo.value);
    }
  }

  protected actualizarHasta(evento: Event): void {
    const campo = evento.target;
    if (campo instanceof HTMLInputElement) {
      this.fechaHastaChange.emit(campo.value);
    }
  }

  protected enviarFormulario(evento: Event): void {
    evento.preventDefault();
    this.buscar.emit();
  }
}
