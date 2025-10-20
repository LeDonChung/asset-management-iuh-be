import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AssetTransaction } from 'src/entities/asset-transaction.entity';
import { AssetTransactionItem } from 'src/entities/asset-transaction-item.entity';
import { AssetTransactionHistory } from 'src/entities/asset-transaction-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { Unit } from 'src/entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetTransaction,
      AssetTransactionItem,
      AssetTransactionHistory,
      Asset,
      AssetBook,
      AssetBookItem,
      Unit
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, PermissionHelperService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
