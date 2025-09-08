import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { ManagerPermission } from 'src/entities/manager-permission.entity';
import { Permission } from 'src/entities/permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService],
  imports: [
    TypeOrmModule.forFeature([ManagerPermission, Permission]),
  ]
})
export class PermissionsModule {}
