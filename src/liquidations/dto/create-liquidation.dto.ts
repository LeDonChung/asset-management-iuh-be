import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { LiquidationStatus } from "../../common/shared/LiquidationStatus";
import { AssetType } from "src/common/shared/AssetType";

export class CreateLiquidationItemDto {
  @ApiProperty({
    description: 'ID của tài sản cần thanh lý',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
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

export class CreateLiquidationProposalDto {
  @ApiProperty({
    description: 'ID của đơn vị đề xuất thanh lý',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({
    description: 'Trạng thái của đề xuất thanh lý',
    enum: LiquidationStatus,
    example: LiquidationStatus.DRAFT,
    required: false,
    default: LiquidationStatus.DRAFT
  })
  @IsOptional()
  @IsEnum(LiquidationStatus)
  status?: LiquidationStatus;

  @ApiProperty({
    description: 'Loại tài sản',
    enum: AssetType,
    example: AssetType.TOOLS_EQUIPMENT,
    required: true,
  })  
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;

  @ApiProperty({
    description: 'Danh sách tài sản trong đề xuất thanh lý',
    type: [CreateLiquidationItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLiquidationItemDto)
  items: CreateLiquidationItemDto[];
}
