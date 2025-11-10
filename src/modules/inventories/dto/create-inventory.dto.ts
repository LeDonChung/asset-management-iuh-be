import { IsString, IsNumber, IsBoolean, IsDateString, IsArray, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventorySessionStatus } from 'src/common/shared/InventorySessionStatus';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Năm của kỳ kiểm kê', example: 2024 })
  @IsNumber()
  year: number;

  @ApiProperty({ description: 'Tên kỳ kiểm kê', example: 'Kiểm kê cuối năm 2024' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Ngày bắt đầu (YYYY-MM-DD)', example: '2024-12-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc (YYYY-MM-DD)', example: '2024-12-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Trạng thái kỳ kiểm kê', 
    enum: InventorySessionStatus,
    example: InventorySessionStatus.PLANNED,
    default: InventorySessionStatus.PLANNED 
  })
  @IsEnum(InventorySessionStatus)
  @IsOptional()
  status?: InventorySessionStatus = InventorySessionStatus.PLANNED;

  @ApiPropertyOptional({ 
    description: 'Danh sách URL hình ảnh', 
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    default: []
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileUrls?: string[] = [];

}
