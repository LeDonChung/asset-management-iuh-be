import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateInventoryGroupDto } from './create-inventory-group.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { InventoryGroupStatus } from 'src/common/shared/InventoryGroupStatus';

export class UpdateInventoryGroupDto extends PartialType(CreateInventoryGroupDto) {
  @ApiProperty({
    description: "Trạng thái nhóm kiểm kê",
    enum: InventoryGroupStatus,
    required: false,
    example: InventoryGroupStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(InventoryGroupStatus)
  status?: InventoryGroupStatus;
}