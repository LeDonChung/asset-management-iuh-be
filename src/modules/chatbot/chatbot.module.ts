import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { OpenAIService } from './openai.service';
import { Asset } from '../../entities/asset.entity';
import { Unit } from '../../entities/unit.entity';
import { Room } from '../../entities/room.entity';
import { Category } from '../../entities/category.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Asset, Unit, Room, Category]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, OpenAIService],
  exports: [ChatbotService, OpenAIService],
})
export class ChatbotModule {}

