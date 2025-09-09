import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedingService } from './seeding.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { ManagerPermission } from 'src/entities/manager-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, ManagerPermission])],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}