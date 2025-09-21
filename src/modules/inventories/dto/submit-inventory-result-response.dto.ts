import { ApiProperty } from '@nestjs/swagger';
import { InventoryResultStatus } from 'src/common/shared/InventoryResultStatus';
import { ScanMethod } from 'src/common/shared/ScanMethod';

export class SubmittedInventoryResultItemDto {
  @ApiProperty({ description: 'ID của kết quả kiểm kê' })
  id: string;

  @ApiProperty({ description: 'ID của tài sản' })
  assetId: string;

  @ApiProperty({ description: 'Số lượng trên hệ thống' })
  systemQuantity: number;

  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  countedQuantity: number;

  @ApiProperty({ description: 'Phương pháp quét', enum: ScanMethod })
  scanMethod: ScanMethod;

  @ApiProperty({ description: 'Trạng thái kết quả', enum: InventoryResultStatus })
  status: InventoryResultStatus;

  @ApiProperty({ description: 'Ghi chú cho tài sản' })
  note: string;

  @ApiProperty({ description: 'Danh sách URLs hình ảnh', type: [String] })
  imageUrls: string[];

  @ApiProperty({ description: 'Người tạo' })
  createdBy: string;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật' })
  updatedAt: Date;
}

export class SubmitInventoryResultResponseDto {
  @ApiProperty({ description: 'ID của phân công kiểm kê' })
  assignmentId: string;

  @ApiProperty({ description: 'Danh sách kết quả kiểm kê đã lưu', type: [SubmittedInventoryResultItemDto] })
  results: SubmittedInventoryResultItemDto[];

  @ApiProperty({ description: 'Ghi chú tổng thể' })
  note: string;

  @ApiProperty({ description: 'Tổng số kết quả đã lưu' })
  totalResults: number;

  @ApiProperty({ description: 'Thống kê kết quả' })
  statistics: {
    totalAssets: number;
    matchedAssets: number;
    missingAssets: number;
    excessAssets: number;
    brokenAssets: number;
    needsRepairAssets: number;
    liquidationProposedAssets: number;
  };

  @ApiProperty({ description: 'Thời gian submit' })
  submittedAt: Date;
}
