import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getSaludarAldownDeSantiago(): string {
    return 'Hola Aldown de Santiago!';
  }

  traerUno(id: string): string {
    return `El id es: ${id}`;
  }
}
