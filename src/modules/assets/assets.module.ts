import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset, FixedAsset, ToolsEquipment } from 'src/entities/asset.entity';
import { RfidTag } from 'src/entities/rfid-tag.entity';
import { Room } from 'src/entities/room.entity';
import { Category } from 'src/entities/category.entity';
import { Unit } from 'src/entities/unit.entity';
import { AssetBook } from 'src/entities/asset-book.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { User } from 'src/entities/user.entity';
import { Role } from 'src/entities/role.entity';
import { AccessControlModule } from 'src/common/services/access-control.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, FixedAsset, ToolsEquipment, RfidTag, Room, Category, Unit, User, Role, AssetBook, AssetBookItem]),
    AccessControlModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, PermissionHelperService],
  exports: [AssetsService],
})
export class AssetsModule {}
