import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessScopeService } from './access-scope.service';
import { UserAccessInfoService } from './user-access-info.service';
import { Unit } from 'src/entities/unit.entity';
import { AccessScope } from 'src/entities/access-scope.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, AccessScope])],
  providers: [AccessScopeService, UserAccessInfoService],
  exports: [AccessScopeService, UserAccessInfoService],
})
export class AccessControlModule {}
