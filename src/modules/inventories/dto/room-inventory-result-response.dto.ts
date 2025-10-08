import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { InventoryResultResponseDto } from './inventory-result-response.dto';

export class RoomInventoryResultResponseDto {
  @ApiProperty({ description: 'ID của phòng' })
  @Expose()
  roomId: string;

  @ApiProperty({ 
    description: 'Danh sách tài sản cố định',
    type: [InventoryResultResponseDto]
  })
  @Expose()
  @Type(() => InventoryResultResponseDto)
  fixedAssets: InventoryResultResponseDto[];

  @ApiProperty({ 
    description: 'Danh sách công cụ dụng cụ',
    type: [InventoryResultResponseDto]
  })
  @Expose()
  @Type(() => InventoryResultResponseDto)
  toolsEquipment: InventoryResultResponseDto[];

  @ApiProperty({ 
    description: 'Thống kê tổng quan',
    type: 'object',
    properties: {
      totalAssets: { type: 'number', description: 'Tổng số tài sản' },
      totalFixedAssets: { type: 'number', description: 'Số tài sản cố định' },
      totalToolsEquipment: { type: 'number', description: 'Số công cụ dụng cụ' },
      matchedAssets: { type: 'number', description: 'Số tài sản khớp' },
      missingAssets: { type: 'number', description: 'Số tài sản thiếu' },
      excessAssets: { type: 'number', description: 'Số tài sản thừa' },
      brokenAssets: { type: 'number', description: 'Số tài sản hỏng' },
      needsRepairAssets: { type: 'number', description: 'Số tài sản cần sửa chữa' },
      liquidationProposedAssets: { type: 'number', description: 'Số tài sản đề xuất thanh lý' }
    }
  })
  @Expose()
  summary: {
    totalAssets: number;
    totalFixedAssets: number;
    totalToolsEquipment: number;
    matchedAssets: number;
    missingAssets: number;
    excessAssets: number;
    brokenAssets: number;
    needsRepairAssets: number;
    liquidationProposedAssets: number;
  };
}
