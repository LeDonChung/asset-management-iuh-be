import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { LiquidationsService } from './liquidations.service';
import { LiquidationsController } from './liquidations.controller';
import { LiquidationProposal } from 'src/entities/liquidation.entity';
import { LiquidationProposalItem } from 'src/entities/liquidation-proposal-item';
import { LiquidationHistory } from 'src/entities/liquidation-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { Unit } from 'src/entities/unit.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { AccessControlModule } from 'src/common/services/access-control.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiquidationProposal,
      LiquidationProposalItem,
      LiquidationHistory,
      Asset,
      AssetBookItem,
      Unit
    ]),
    MulterModule.register({
      dest: './uploads/temp',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    AccessControlModule,
  ],
  controllers: [LiquidationsController],
  providers: [LiquidationsService, PermissionHelperService],
  exports: [LiquidationsService]
})
export class LiquidationsModule {}
