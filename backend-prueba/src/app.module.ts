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

@Controller()
class RootController {
  @Get()
  sayHello(): string {
    return 'funciona!!!';
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot("mongodb://admin:147@ac-jibyhae-shard-00-00.4wuaaks.mongodb.net:27017,ac-jibyhae-shard-00-01.4wuaaks.mongodb.net:27017,ac-jibyhae-shard-00-02.4wuaaks.mongodb.net:27017/?ssl=true&replicaSet=atlas-e5mpsr-shard-0&authSource=admin", {
      retryAttempts: 1,
      retryDelay: 1000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }),
  ],
  controllers: [AppController, RootController],
})
export class AppModule {}
