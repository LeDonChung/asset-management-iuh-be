import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset, FixedAsset, ToolsEquipment } from 'src/entities/asset.entity';
import { RfidTag } from 'src/entities/rfid-tag.entity';
import { Room } from 'src/entities/room.entity';
import { Category } from 'src/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, FixedAsset, ToolsEquipment, RfidTag, Room, Category]),
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
