import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from 'src/entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { LiquidationsModule } from 'src/modules/liquidations/liquidations.module';
import { Unit } from 'src/entities/unit.entity';
import { AccessControlModule } from 'src/common/services/access-control.module';
import { AccessScope } from 'src/entities/access-scope.entity';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PermissionHelperService],
  imports: [
    TypeOrmModule.forFeature([Role, Permission, Unit, AccessScope]),
    AccessControlModule,
  ],
  exports: [RolesService]
})
export class RolesModule {}
