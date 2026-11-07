import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller("a")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('saludar')
  getSaludarSantiago(): string {
    return this.appService.getSaludarAldownDeSantiago();
  }

  @Get(':id')
  traerUno(@Param('id') id: string): string {
    return this.appService.traerUno(id);
  }
}
