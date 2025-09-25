import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryResultStatus } from 'src/common/shared/InventoryResultStatus';
import { ScanMethod } from 'src/common/shared/ScanMethod';

export class SubmitInventoryResultItemDto {
  @ApiProperty({ description: 'ID của tài sản' })
  @IsString()
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'ID của phòng' })
  @IsString()
  @IsUUID()
  roomId: string;

  @ApiProperty({ description: 'Số lượng trên hệ thống' })
  @IsNumber()
  @Min(0)
  systemQuantity: number;

  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  @IsNumber()
  @Min(0)
  countedQuantity: number;

  @ApiProperty({ description: 'Phương pháp quét', enum: ScanMethod })
  @IsEnum(ScanMethod)
  scanMethod: ScanMethod;

  @ApiProperty({ description: 'Trạng thái kết quả', enum: InventoryResultStatus })
  @IsEnum(InventoryResultStatus)
  status: InventoryResultStatus;

  @ApiProperty({ description: 'Ghi chú cho tài sản', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Danh sách URLs hình ảnh', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

export class SubmitInventoryResultDto {
  @ApiProperty({ description: 'ID của phân công kiểm kê' })
  @IsString()
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ description: 'Danh sách kết quả kiểm kê', type: [SubmitInventoryResultItemDto] })
  @IsArray()
  results: SubmitInventoryResultItemDto[];

  @ApiProperty({ description: 'Ghi chú tổng thể', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
