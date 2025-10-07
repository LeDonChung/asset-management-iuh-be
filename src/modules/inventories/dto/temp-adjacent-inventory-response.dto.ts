import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AdjacentAssetInventoryDetail, RoomAdjacentResult } from './save-temp-adjacent-inventory.dto';

export class TempAdjacentInventoryResponseDto {
  @ApiProperty({ description: 'Danh sách kết quả theo phòng', type: [RoomAdjacentResult] })
  @Expose()
  @Type(() => RoomAdjacentResult)
  roomResults: RoomAdjacentResult[];

  @ApiProperty({ description: 'Ghi chú', required: false })
  @Expose()
  note?: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian hết hạn' })
  @Expose()
  expiresAt: Date;

  @ApiProperty({ description: 'Thời gian sống còn lại (giây)' })
  @Expose()
  ttl: number;

  @ApiProperty({ description: 'Tổng số phòng' })
  @Expose()
  totalRooms: number;

  @ApiProperty({ description: 'Tổng số tài sản' })
  @Expose()
  totalAssets: number;

  @ApiProperty({ description: 'Số tài sản khớp' })
  @Expose()
  matchedAssets: number;

  @ApiProperty({ description: 'Số tài sản thiếu' })
  @Expose()
  missingAssets: number;

  @ApiProperty({ description: 'Số tài sản thừa' })
  @Expose()
  excessAssets: number;

  @ApiProperty({ description: 'Số tài sản hỏng' })
  @Expose()
  brokenAssets: number;

  @ApiProperty({ description: 'Số tài sản cần sửa chữa' })
  @Expose()
  needsRepairAssets: number;

  @ApiProperty({ description: 'Số tài sản đề xuất thanh lý' })
  @Expose()
  liquidationProposedAssets: number;
}
