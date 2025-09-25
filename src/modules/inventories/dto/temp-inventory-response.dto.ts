import { ApiProperty } from '@nestjs/swagger';
import { AssetInventoryDetail } from './save-temp-inventory.dto';

export class TempInventoryResponseDto {
  @ApiProperty({ description: 'ID của phòng' })
  roomId: string;

  @ApiProperty({ description: 'ID của đơn vị' })
  unitId: string;

  @ApiProperty({ description: 'ID của phiên kiểm kê' })
  sessionId: string;

  @ApiProperty({ 
    description: 'Kết quả kiểm kê tạm thời chi tiết', 
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/AssetInventoryDetail' }
  })
  inventoryResults: { [assetId: string]: AssetInventoryDetail };

  @ApiProperty({ description: 'Ghi chú tổng thể' })
  note?: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian hết hạn' })
  expiresAt: Date;

  @ApiProperty({ description: 'Thời gian còn lại (giây)' })
  ttl: number;

  @ApiProperty({ description: 'Tổng số tài sản' })
  totalAssets: number;

  @ApiProperty({ description: 'Số tài sản khớp' })
  matchedAssets: number;

  @ApiProperty({ description: 'Số tài sản thiếu' })
  missingAssets: number;

  @ApiProperty({ description: 'Số tài sản thừa' })
  excessAssets: number;

  @ApiProperty({ description: 'Số tài sản hỏng' })
  brokenAssets: number;

  @ApiProperty({ description: 'Số tài sản cần sửa chữa' })
  needsRepairAssets: number;

  @ApiProperty({ description: 'Số tài sản đề xuất thanh lý' })
  liquidationProposedAssets: number;
}
