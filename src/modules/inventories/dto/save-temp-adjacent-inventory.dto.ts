import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsEnum, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export enum ScanMethod {
  RFID = 'RFID',
  MANUAL = 'MANUAL',
}

export enum AssetActionStatus {
  MATCHED = 'MATCHED',
  MISSING = 'MISSING',
  EXCESS = 'EXCESS',
  BROKEN = 'BROKEN',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  LIQUIDATION_PROPOSED = 'LIQUIDATION_PROPOSED',
}

export class AdjacentAssetInventoryDetail {
  @ApiProperty({ description: 'ID của tài sản' })
  @IsNotEmpty()
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'ID của phòng chứa tài sản' })
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Số lượng trong hệ thống', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  systemQuantity: number;

  @ApiProperty({ description: 'Số lượng đã kiểm', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  countedQuantity: number;

  @ApiProperty({ description: 'Phương thức quét', enum: ScanMethod, example: ScanMethod.RFID })
  @IsNotEmpty()
  @IsEnum(ScanMethod)
  scanMethod: ScanMethod;

  @ApiProperty({ description: 'Trạng thái tài sản', enum: AssetActionStatus, example: AssetActionStatus.MATCHED })
  @IsNotEmpty()
  @IsEnum(AssetActionStatus)
  status: AssetActionStatus;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Danh sách URL hình ảnh', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @ApiProperty({ description: 'Loại tài sản (neighbor, other)', example: 'neighbor' })
  @IsNotEmpty()
  @IsString()
  assetType: string;

  // Additional metadata for asset restoration
  @ApiProperty({ description: 'Mã KT của tài sản', required: false })
  @IsOptional()
  @IsString()
  ktCode?: string;

  @ApiProperty({ description: 'Tên tài sản', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Mã phòng', required: false })
  @IsOptional()
  @IsString()
  roomCode?: string;

  @ApiProperty({ description: 'RFID Tag', required: false })
  @IsOptional()
  @IsString()
  rfidTag?: string;
}

export class RoomAdjacentResult {
  @ApiProperty({ description: 'ID của phòng' })
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Danh sách kết quả kiểm kê tài sản hàng xóm', type: [AdjacentAssetInventoryDetail] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjacentAssetInventoryDetail)
  result: AdjacentAssetInventoryDetail[];
}

export class SaveTempAdjacentInventoryDto {
  @ApiProperty({ description: 'Danh sách kết quả theo phòng', type: [RoomAdjacentResult] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomAdjacentResult)
  roomResults: RoomAdjacentResult[];

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Thời gian sống của dữ liệu trong Redis (giây)', example: 86400, required: false })
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}
