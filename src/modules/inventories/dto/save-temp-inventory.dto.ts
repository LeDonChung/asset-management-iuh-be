import { IsString, IsObject, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryResultStatus } from 'src/common/shared/InventoryResultStatus';

export class AssetInventoryDetail {
  @ApiProperty({ description: 'Số lượng kiểm kê' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Trạng thái tài sản', enum: InventoryResultStatus })
  @IsEnum(InventoryResultStatus)
  status: InventoryResultStatus;

  @ApiProperty({ description: 'Ghi chú cho tài sản', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Danh sách links hình ảnh', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ description: 'Thời gian cập nhật' })
  @IsString()
  updatedAt: string;
}

export class SaveTempInventoryDto {
  @ApiProperty({ description: 'ID của phòng' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'ID của đơn vị' })
  @IsString()
  unitId: string;

  @ApiProperty({ description: 'ID của phiên kiểm kê' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Kết quả kiểm kê tạm thời chi tiết' })
  @IsObject()
  inventoryResults: { [assetId: string]: AssetInventoryDetail };

  @ApiProperty({ description: 'Ghi chú tổng thể', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Thời gian hết hạn (giây)', required: false, default: 86400 })
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}
