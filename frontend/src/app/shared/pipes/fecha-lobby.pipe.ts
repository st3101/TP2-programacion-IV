import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaLobby',
  standalone: true,
})
export class FechaLobbyPipe implements PipeTransform {
  transform(
    valor: string | number | Date | null | undefined,
    formato: 'fecha' | 'fechaHora' | 'tiempoRelativo' = 'fecha',
  ): string {
    if (!valor) {
      return '—';
    }

    let fecha: Date;
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      fecha = new Date(`${valor}T12:00:00-03:00`);
    } else {
      fecha = new Date(valor);
    }

    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }

    if (formato === 'tiempoRelativo') {
      const minutos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60_000));
      if (minutos < 1) {
        return 'ahora';
      }
      if (minutos < 60) {
        return `hace ${minutos} min`;
      }

      const horas = Math.floor(minutos / 60);
      if (horas < 24) {
        return `hace ${horas} h`;
      }

      return `hace ${Math.floor(horas / 24)} d`;
    }

    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires',
    };

    if (formato === 'fechaHora') {
      opciones.hour = '2-digit';
      opciones.minute = '2-digit';
      opciones.hourCycle = 'h23';
    }

    return new Intl.DateTimeFormat('es-AR', opciones).format(fecha);
  }
}
