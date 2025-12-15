import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryResultDto {
  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  @IsNumber()
  @Min(0)
  countedQuantity: number;
}

