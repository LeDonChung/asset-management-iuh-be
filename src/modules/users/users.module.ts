import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Unit } from '../../entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Unit]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
