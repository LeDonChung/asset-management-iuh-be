import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { AssetMovement } from 'src/entities/asset-movement.entity';
import { AssetMovementItem } from 'src/entities/asset-movement-item.entity';
import { AssetMovementHistory } from 'src/entities/asset-movement-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { Room } from 'src/entities/room.entity';
import { User } from 'src/entities/user.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetMovement,
      AssetMovementItem,
      AssetMovementHistory,
      Asset,
      Room,
      User,
      AssetBook,
      AssetBookItem,
    ]),
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
