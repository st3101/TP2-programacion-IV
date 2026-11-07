import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Controller('hola')
class AppController {
  @Get()
  sayHello(): string {
    return 'funciona!!!';
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? ''),
  ],
  controllers: [AppController],
})
export class AppModule {}
