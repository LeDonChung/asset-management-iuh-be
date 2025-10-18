import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit } from 'src/entities/unit.entity';
import { User } from 'src/entities/user.entity';
import { Room } from 'src/entities/room.entity';
import { RoomsService } from '../rooms/rooms.service';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, User, Room])],
  controllers: [UnitsController],
  providers: [UnitsService, RoomsService, PermissionHelperService],
  exports: [UnitsService],
})
export class UnitsModule {}
