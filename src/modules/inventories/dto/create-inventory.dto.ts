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

  @ApiProperty({ description: 'Đợt kiểm kê', example: 1 })
  @IsNumber()
  period: number;

  @ApiPropertyOptional({ description: 'Có phải kỳ kiểm kê toàn cục không', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean = false;

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

  @ApiPropertyOptional({ 
    description: 'Danh sách ID các đơn vị', 
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    default: []
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  unitIds?: string[] = [];
}
