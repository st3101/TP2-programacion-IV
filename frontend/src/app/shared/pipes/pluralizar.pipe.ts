import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pluralizar',
  standalone: true,
})
export class PluralizarPipe implements PipeTransform {
  transform(cantidad: number, singular: string, plural: string): string {
    if (cantidad === 1) {
      return singular;
    }

    return plural;
  }
}
