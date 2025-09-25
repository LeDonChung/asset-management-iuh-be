import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Room } from 'src/entities/room.entity';
import { Unit } from 'src/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Unit])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
