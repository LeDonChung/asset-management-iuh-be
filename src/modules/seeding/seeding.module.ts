import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedingService } from './seeding.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { ManagerPermission } from 'src/entities/manager-permission.entity';
import { Category } from 'src/entities/category.entity';
import { Unit } from 'src/entities/unit.entity';
import { Room } from 'src/entities/room.entity';
import { AccessScope } from 'src/entities/access-scope.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, ManagerPermission, Category, Unit, Room, AccessScope ])],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}