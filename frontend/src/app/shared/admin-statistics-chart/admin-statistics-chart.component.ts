import { Component, Input } from '@angular/core';

export interface GraficoBarraItem {
  id: string;
  etiqueta: string;
  detalle?: string;
  cantidad: number;
}

interface EtiquetaEje {
  posicion: number;
  texto: string;
}

@Component({
  selector: 'app-admin-statistics-chart',
  templateUrl: './admin-statistics-chart.component.html',
  styleUrl: './admin-statistics-chart.component.css',
})
export class AdminStatisticsChartComponent {
  @Input() titulo = '';
  @Input() total = 0;
  @Input() nombreTotal = '';
  @Input() elementos: GraficoBarraItem[] = [];
  @Input() mensajeVacio = 'No hay datos para mostrar.';
  @Input() colorComentarios = false;
  @Input() tipo: 'barras' | 'lineas' | 'torta' = 'barras';

  private readonly coloresTorta = ['#d99589', '#8eacc4', '#c7bd63', '#a996c9', '#79ad91', '#d3a85d'];

  protected anchoBarra(cantidad: number): number {
    let cantidadMayor = 0;
    for (const elemento of this.elementos) {
      if (elemento.cantidad > cantidadMayor) {
        cantidadMayor = elemento.cantidad;
      }
    }

    if (cantidadMayor === 0) {
      return 0;
    }
    return (cantidad / cantidadMayor) * 100;
  }

  protected puntosLinea(): string {
    let cantidadMayor = 0;
    for (const elemento of this.elementos) {
      if (elemento.cantidad > cantidadMayor) {
        cantidadMayor = elemento.cantidad;
      }
    }

    if (cantidadMayor === 0 || this.elementos.length === 0) {
      return '';
    }

    const puntos: string[] = [];
    for (let indice = 0; indice < this.elementos.length; indice++) {
      const x = this.posicionX(indice);
      const y = 90 - (this.elementos[indice].cantidad / cantidadMayor) * 75;
      puntos.push(`${x},${y}`);
    }
    return puntos.join(' ');
  }

  protected posicionX(indice: number): number {
    if (this.elementos.length === 1) {
      return 50;
    }
    return 5 + (indice / (this.elementos.length - 1)) * 90;
  }

  protected posicionY(cantidad: number): number {
    let cantidadMayor = 0;
    for (const elemento of this.elementos) {
      if (elemento.cantidad > cantidadMayor) {
        cantidadMayor = elemento.cantidad;
      }
    }
    if (cantidadMayor === 0) {
      return 90;
    }
    return 90 - (cantidad / cantidadMayor) * 75;
  }

  protected valorMaximo(): number {
    let cantidadMayor = 0;
    for (const elemento of this.elementos) {
      if (elemento.cantidad > cantidadMayor) {
        cantidadMayor = elemento.cantidad;
      }
    }
    return cantidadMayor;
  }

  protected valorIntermedio(): number {
    return this.valorMaximo() / 2;
  }

  protected etiquetasDelEje(): EtiquetaEje[] {
    if (this.elementos.length === 0) {
      return [];
    }

    const indices = [0, Math.floor((this.elementos.length - 1) / 2), this.elementos.length - 1];
    const etiquetas: EtiquetaEje[] = [];
    for (const indice of indices) {
      if (etiquetas.some((etiqueta) => etiqueta.posicion === this.posicionX(indice))) {
        continue;
      }
      const fecha = this.elementos[indice].etiqueta;
      etiquetas.push({
        posicion: this.posicionX(indice),
        texto: fecha.includes('-') ? fecha.slice(5).replace('-', '/') : fecha,
      });
    }
    return etiquetas;
  }

  protected fondoTorta(): string {
    let totalElementos = 0;
    for (const elemento of this.elementos) {
      totalElementos += elemento.cantidad;
    }
    if (totalElementos === 0) {
      return '#333';
    }

    let gradosAcumulados = 0;
    const sectores: string[] = [];
    for (let indice = 0; indice < this.elementos.length; indice++) {
      const elemento = this.elementos[indice];
      const inicio = gradosAcumulados;
      gradosAcumulados += (elemento.cantidad / totalElementos) * 360;
      sectores.push(`${this.coloresTorta[indice % this.coloresTorta.length]} ${inicio}deg ${gradosAcumulados}deg`);
    }
    return `conic-gradient(${sectores.join(', ')})`;
  }

  protected colorElemento(indice: number): string {
    return this.coloresTorta[indice % this.coloresTorta.length];
  }
}
