import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetBooksService } from './asset-books.service';
import { AssetBooksController } from './asset-books.controller';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { Unit } from 'src/entities/unit.entity';
import { Asset, FixedAsset } from 'src/entities/asset.entity';
import { Room } from 'src/entities/room.entity';
import { RfidTag } from 'src/entities/rfid-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetBook,
      AssetBookItem,
      Unit,
      Asset,
      Room,
      RfidTag,
      FixedAsset,

    ]),
  ],
  controllers: [AssetBooksController],
  providers: [AssetBooksService],
  exports: [AssetBooksService],
})
export class AssetBooksModule {}
