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
    MongooseModule.forRoot(process.env.MONGODB_URI ?? '', {
      retryAttempts: 1,
      retryDelay: 1000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
