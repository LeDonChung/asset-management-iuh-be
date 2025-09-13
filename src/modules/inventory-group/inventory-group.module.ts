import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryGroupService } from './inventory-group.service';
import { InventoryGroupController } from './inventory-group.controller';
import { InventoryGroup } from 'src/entities/inventory-group';
import { InventorySub } from 'src/entities/inventory-sub.entity';
import { InventoryGroupMember } from 'src/entities/inventory-group-member.entity';
import { InventoryGroupAssignment } from 'src/entities/inventory-group-assignment';
import { User } from 'src/entities/user.entity';
import { Unit } from 'src/entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryGroup,
      InventorySub,
      InventoryGroupMember,
      InventoryGroupAssignment,
      User,
      Unit,
    ]),
  ],
  controllers: [InventoryGroupController],
  providers: [InventoryGroupService],
  exports: [InventoryGroupService],
})
export class InventoryGroupModule {}
