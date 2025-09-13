import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';
import { InventorySession } from 'src/entities/inventory-session.entity';
import { FileUrl } from 'src/entities/file-url.entity';
import { InventorySessionUnit } from 'src/entities/inventory-session-unit.entity';
import { Unit } from 'src/entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventorySession,
      FileUrl,
      InventorySessionUnit,
      Unit,
    ]),
  ],
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}