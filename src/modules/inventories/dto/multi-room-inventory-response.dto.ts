import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AssetInventorySimpleDto {
  @ApiProperty({ description: 'ID của kết quả kiểm kê' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'ID của tài sản' })
  @Expose()
  assetId: string;

  @ApiProperty({ description: 'Số lượng trên hệ thống' })
  @Expose()
  systemQuantity: number;

  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  @Expose()
  countedQuantity: number;

  @ApiProperty({ description: 'Trạng thái kiểm kê' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Phương pháp quét' })
  @Expose()
  scanMethod: string;

  @ApiProperty({ description: 'Ghi chú' })
  @Expose()
  note: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ 
    description: 'Thông tin tài sản cơ bản',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID tài sản' },
      name: { type: 'string', description: 'Tên tài sản' },
      fixedCode: { type: 'string', description: 'Mã tài sản cố định' },
      ktCode: { type: 'string', description: 'Mã kiểm toán' },
      type: { type: 'string', description: 'Loại tài sản' }
    }
  })
  @Expose()
  asset: {
    id: string;
    name: string;
    fixedCode: string;
    ktCode: string;
    type: string;
  };
}

export class RoomInventorySimpleDto {
  @ApiProperty({ description: 'ID của phòng' })
  @Expose()
  roomId: string;

  @ApiProperty({ description: 'Tên phòng' })
  @Expose()
  roomName: string;

  @ApiProperty({ 
    description: 'Danh sách tài sản cố định',
    type: [AssetInventorySimpleDto]
  })
  @Expose()
  @Type(() => AssetInventorySimpleDto)
  fixedAssets: AssetInventorySimpleDto[];

  @ApiProperty({ 
    description: 'Danh sách công cụ dụng cụ',
    type: [AssetInventorySimpleDto]
  })
  @Expose()
  @Type(() => AssetInventorySimpleDto)
  toolsEquipment?: AssetInventorySimpleDto[];
}

export class MultiRoomInventoryResponseDto {
  @ApiProperty({ 
    description: 'Danh sách phòng và kết quả kiểm kê',
    type: [RoomInventorySimpleDto]
  })
  @Expose()
  @Type(() => RoomInventorySimpleDto)
  rooms: RoomInventorySimpleDto[];

  @ApiProperty({ description: 'Trang hiện tại' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Kích thước trang' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Tổng số phòng' })
  @Expose()
  totalRooms: number;

  @ApiProperty({ description: 'Tổng số trang' })
  @Expose()
  totalPages: number;

  @ApiProperty({ description: 'Có trang tiếp theo' })
  @Expose()
  hasNext: boolean;

  @ApiProperty({ description: 'Có trang trước' })
  @Expose()
  hasPrev: boolean;
}
