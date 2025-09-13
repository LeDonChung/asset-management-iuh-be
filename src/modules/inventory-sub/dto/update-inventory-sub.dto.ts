import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateInventorySubDto } from './create-inventory-sub.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { InventorySubStatus } from 'src/common/shared/InventorySubStatus';

export class UpdateInventorySubDto extends PartialType(CreateInventorySubDto) {
  @ApiProperty({
    description: "Trạng thái tiểu ban",
    enum: InventorySubStatus,
    required: false,
    example: InventorySubStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(InventorySubStatus)
  status?: InventorySubStatus;
}