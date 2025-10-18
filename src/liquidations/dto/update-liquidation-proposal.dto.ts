import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateLiquidationItemDto {
  @ApiProperty({
    description: 'ID của item (nếu có - để cập nhật item hiện tại)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'ID của tài sản cần thanh lý',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  assetId: string;

  @ApiProperty({
    description: 'Số lượng theo sổ sách',
    example: 10,
    minimum: 0
  })
  @IsNumber()
  systemQuantity: number;

  @ApiProperty({
    description: 'Số lượng theo kiểm kê thực tế',
    example: 8,
    minimum: 0
  })
  @IsNumber()
  countedQuantity: number;

  @ApiProperty({
    description: 'Ghi chú thêm về tài sản',
    example: 'Tài sản bị hư hỏng, không thể sử dụng',
    required: false
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'URL hình ảnh minh chứng',
    example: 'https://example.com/images/evidence.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateLiquidationProposalDto {
  @ApiProperty({
    description: 'ID của đơn vị đề xuất thanh lý',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({
    description: 'Danh sách tài sản trong đề xuất thanh lý (sẽ thay thế toàn bộ danh sách hiện tại)',
    type: [UpdateLiquidationItemDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLiquidationItemDto)
  items?: UpdateLiquidationItemDto[];
}
