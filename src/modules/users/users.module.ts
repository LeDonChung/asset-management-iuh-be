import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Unit } from '../../entities/unit.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { AccessControlModule } from 'src/common/services/access-control.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Unit]),
    AccessControlModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, PermissionHelperService],
  exports: [UsersService]
})
export class UsersModule {}
