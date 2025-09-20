import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { BaseFilterDto } from 'src/common/dto/base-filter.dto';

export enum InventoryStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

export class InventoryFilterDto extends BaseFilterDto {

  // Legacy quick filters for backward compatibility
  @ApiPropertyOptional({ 
    description: 'Quick filter by status',
    enum: InventoryStatus,
    isArray: true
  })
  @IsOptional()
  @IsEnum(InventoryStatus, { each: true })
  statusFilter?: InventoryStatus[];

  @ApiPropertyOptional({ 
    description: 'Quick filter by year',
    type: [Number]
  })
  @IsOptional()
  yearFilter?: number[];

  @ApiPropertyOptional({ 
    description: 'Quick filter by global scope',
    type: Boolean
  })
  @IsOptional()
  isGlobalFilter?: boolean;
}
