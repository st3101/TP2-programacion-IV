import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nombrePropio',
  standalone: true,
})
export class NombrePropioPipe implements PipeTransform {
  transform(texto: string | null | undefined): string {
    if (!texto) {
      return '';
    }

    const palabras = texto.trim().split(/\s+/);
    const palabrasConMayuscula = palabras.map((palabra) => {
      const primeraLetra = palabra.charAt(0).toLocaleUpperCase('es-AR');
      const resto = palabra.slice(1).toLocaleLowerCase('es-AR');
      return primeraLetra + resto;
    });

    return palabrasConMayuscula.join(' ');
  }
}
