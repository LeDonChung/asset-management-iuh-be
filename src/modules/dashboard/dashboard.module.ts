import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Asset } from 'src/entities/asset.entity';
import { AssetTransaction } from 'src/entities/asset-transaction.entity';
import { AssetMovement } from 'src/entities/asset-movement.entity';
import { Unit } from 'src/entities/unit.entity';
import { AccessScope } from 'src/entities/access-scope.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { AccessScopeService } from 'src/common/services/access-scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetTransaction,
      AssetMovement,
      Unit,
      AccessScope,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, PermissionHelperService, AccessScopeService],
  exports: [DashboardService],
})
export class DashboardModule {}

