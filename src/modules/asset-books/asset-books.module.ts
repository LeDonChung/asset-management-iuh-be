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
import { InventoryResult } from 'src/entities/inventory-result';
import { InventorySession } from 'src/entities/inventory-session.entity';
import { InventoryGroupAssignment } from 'src/entities/inventory-group-assignment';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { AccessControlModule } from 'src/common/services/access-control.module';

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
      InventoryResult,
      InventorySession,
      InventoryGroupAssignment,
    ]),
    AccessControlModule,
  ],
  controllers: [AssetBooksController],
  providers: [AssetBooksService, PermissionHelperService],
  exports: [AssetBooksService],
})
export class AssetBooksModule {}
