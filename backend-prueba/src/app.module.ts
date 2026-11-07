import { Controller, Get, Module } from '@nestjs/common';

@Controller('hola')
class AppController {
  @Get()
  sayHello(): string {
    return 'funciona!!!';
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}
