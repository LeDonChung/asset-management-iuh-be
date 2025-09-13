import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventorySubService } from './inventory-sub.service';
import { InventorySubController } from './inventory-sub.controller';
import { InventorySub } from 'src/entities/inventory-sub.entity';
import { InventorySessionUnit } from 'src/entities/inventory-session-unit.entity';
import { SubInventoryMember } from 'src/entities/sub-inventory-member.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventorySub,
      InventorySessionUnit,
      SubInventoryMember,
      User,
    ]),
  ],
  controllers: [InventorySubController],
  providers: [InventorySubService],
  exports: [InventorySubService],
})
export class InventorySubModule {}
