import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidationsService } from './liquidations.service';
import { LiquidationsController } from './liquidations.controller';
import { LiquidationProposal } from 'src/entities/liquidation.entity';
import { LiquidationProposalItem } from 'src/entities/liquidation-proposal-item';
import { LiquidationHistory } from 'src/entities/liquidation-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { Unit } from 'src/entities/unit.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiquidationProposal,
      LiquidationProposalItem,
      LiquidationHistory,
      Asset,
      Unit
    ])
  ],
  controllers: [LiquidationsController],
  providers: [LiquidationsService, PermissionHelperService],
  exports: [LiquidationsService]
})
export class LiquidationsModule {}
