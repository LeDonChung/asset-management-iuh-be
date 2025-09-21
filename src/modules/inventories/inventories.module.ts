import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';
import { InventorySession } from 'src/entities/inventory-session.entity';
import { FileUrl } from 'src/entities/file-url.entity';
import { InventorySessionUnit } from 'src/entities/inventory-session-unit.entity';
import { InventorySessionMember } from 'src/entities/inventory-session-member.entity';
import { Unit } from 'src/entities/unit.entity';
import { User } from 'src/entities/user.entity';
import { InventoryGroupMember } from 'src/entities/inventory-group-member.entity';
import { InventoryGroup } from 'src/entities/inventory-group';
import { InventoryGroupAssignment } from 'src/entities/inventory-group-assignment';
import { InventoryResult } from 'src/entities/inventory-result';
import { Asset } from 'src/entities/asset.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventorySession,
      FileUrl,
      InventorySessionUnit,
      InventorySessionMember,
      InventoryGroupMember,
      Unit,
      User,
      InventoryGroup,
      InventoryGroupAssignment,
      InventoryResult,
      Asset,
    ]),
    RedisModule,
  ],
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}