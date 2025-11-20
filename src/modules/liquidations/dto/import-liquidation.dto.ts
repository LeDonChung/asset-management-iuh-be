import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { AssetType } from "src/common/shared/AssetType";
import { LiquidationStatus } from "src/common/shared/LiquidationStatus";

export class ImportLiquidationItemDto {
  @ApiProperty({
    description: 'Mã tài sản cố định (TSCĐ)',
    example: '123.45678.2023'
  })
  @IsString()
  @IsNotEmpty()
  fixedCode: string;

  @ApiProperty({
    description: 'Mã kế toán (KT)',
    example: 'KT.123.456'
  })
  @IsString()
  @IsNotEmpty()
  ktCode: string;

  @ApiProperty({
    description: 'Số lượng theo sổ sách',
    example: 10,
    minimum: 0
  })
  @IsInt()
  @Min(0)
  systemQuantity: number;

  @ApiProperty({
    description: 'Số lượng theo thực tế',
    example: 8,
    minimum: 0
  })
  @IsInt()
  @Min(0)
  countedQuantity: number;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Tài sản bị hư hỏng, không thể sử dụng',
    required: false
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportLiquidationProposalDto {
  @ApiProperty({
    description: 'ID của đơn vị đề xuất thanh lý',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  unitId: string;

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
    description: 'Danh sách tài sản từ file Excel',
    type: [ImportLiquidationItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLiquidationItemDto)
  items: ImportLiquidationItemDto[];
}

export class ImportLiquidationResultDto {
  @ApiProperty({
    description: 'Tổng số dòng đã xử lý',
    example: 100
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Số lượng thành công',
    example: 95
  })
  successCount: number;

  @ApiProperty({
    description: 'Số lượng lỗi',
    example: 5
  })
  errorCount: number;

  @ApiProperty({
    description: 'Danh sách lỗi',
    type: [String]
  })
  errors: string[];

  @ApiProperty({
    description: 'ID của đề xuất thanh lý được tạo (nếu thành công)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  liquidationProposalId?: string;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Import thành công 95/100 tài sản'
  })
  message: string;
}

export class ExportAssetsForLiquidationDto {
  @ApiProperty({
    description: 'ID của đề xuất thanh lý cần xuất danh sách tài sản',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;
}
