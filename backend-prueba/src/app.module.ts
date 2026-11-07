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
    MongooseModule.forRoot("mongodb+srv://sleonardi:3cVxZ2eX2btIyiHu@programacioniv.4wuaaks.mongodb.net/?appName=ProgramacionIV", {
      retryAttempts: 1,
      retryDelay: 1000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
