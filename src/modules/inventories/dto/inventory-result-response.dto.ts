import { InventoryResultStatus } from "src/common/shared/InventoryResultStatus";
import { ScanMethod } from "src/common/shared/ScanMethod";
import { FileUrlResponseDto } from "./inventory-response.dto";
import { InventoryGroupAssignmentDto } from "src/modules/inventory-group/dto/inventory-group-response.dto";
import { AssetResponseDto } from "src/modules/assets/dto/asset-response.dto";
import { RoomResponseDto } from "src/modules/rooms/dto/room-response.dto";
import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
export class InventoryResultResponseDto {
  @ApiProperty({ description: 'ID của kết quả kiểm kê' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Số lượng trên hệ thống' })
  @Expose()
  systemQuantity: number;

  @ApiProperty({ description: 'ID của tài sản' })
  @Expose()
  assetId: string;

  @ApiProperty({ description: 'ID của phân công kiểm kê' })
  @Expose()
  assignmentId: string;

  @ApiProperty({ description: 'ID của phòng' })
  @Expose()
  roomId: string;

  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  @Expose()
  countedQuantity: number;

  @ApiProperty({ description: 'Phương pháp quét', enum: ScanMethod })
  @Expose()
  scanMethod: ScanMethod;

  @ApiProperty({ description: 'Trạng thái', enum: InventoryResultStatus })
  @Expose()
  status: InventoryResultStatus;

  @ApiProperty({ description: 'Ghi chú' })
  @Expose()
  note: string;

  @ApiProperty({ description: 'Danh sách URL file', type: [FileUrlResponseDto] })
  @Expose()
  @Type(() => FileUrlResponseDto)
  fileUrls?: FileUrlResponseDto[];

  @ApiProperty({ description: 'Người tạo' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Thông tin tài sản', type: AssetResponseDto })
  @Expose()
  @Type(() => AssetResponseDto)
  asset: AssetResponseDto;

  @ApiProperty({ description: 'Thông tin phòng', type: RoomResponseDto })
  @Expose()
  @Type(() => RoomResponseDto)
  room: RoomResponseDto;

  @ApiProperty({ description: 'Danh sách URL hình ảnh', type: [String] })
  @Expose()
  imageUrls?: string[];

  @ApiProperty({ description: 'Đã được submit chính thức' })
  @Expose()
  isSubmitted?: boolean;
}
