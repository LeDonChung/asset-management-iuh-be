import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';

export class WarehouseAssetResponseDto {
  @ApiProperty({
    description: 'ID của tài sản',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'Mã kế toán',
    example: '19-0205/00'
  })
  ktCode: string;

  @ApiProperty({
    description: 'Mã tài sản cố định',
    example: '2019.0205'
  })
  fixedCode: string;

  @ApiProperty({
    description: 'Tên tài sản',
    example: 'Máy tính xách tay Dell Latitude'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Thông số kỹ thuật',
    example: 'Intel Core i5, 8GB RAM, 256GB SSD'
  })
  specs?: string;

  @ApiProperty({
    description: 'Ngày nhập',
    example: '2023-01-15'
  })
  entrydate: Date;

  @ApiProperty({
    description: 'Đơn vị tính',
    example: 'chiếc'
  })
  unit: string;

  @ApiPropertyOptional({
    description: 'Vị trí cụ thể trong phòng',
    example: 'Bàn A1, góc phòng'
  })
  locationInRoom?: string;

  @ApiProperty({
    description: 'Số lượng',
    example: 1
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Xuất xứ',
    example: 'Việt Nam'
  })
  origin?: string;

  @ApiProperty({
    description: 'Gói mua',
    example: 1
  })
  purchasePackage: number;

  @ApiProperty({
    description: 'Loại tài sản',
    enum: AssetType,
    example: AssetType.FIXED_ASSET
  })
  type: AssetType;

  @ApiProperty({
    description: 'Trạng thái tài sản',
    enum: AssetStatus,
    example: AssetStatus.IN_USE
  })
  status: AssetStatus;

  @ApiProperty({
    description: 'Cho phép di chuyển',
    example: true
  })
  allowMove: boolean;

  @ApiProperty({
    description: 'Ngày tạo',
    example: '2023-01-15T08:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Ngày cập nhật',
    example: '2023-01-15T08:30:00Z'
  })
  updatedAt: Date;

  // Relationship data
  @ApiPropertyOptional({
    description: 'Thông tin danh mục',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Máy tính',
      code: 'MAYTINH'
    }
  })
  category?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Phòng hiện tại (kho)',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Kho Phòng Kế Toán',
      roomCode: 'KHO_PKT'
    }
  })
  currentRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiPropertyOptional({
    description: 'Đơn vị sở hữu hiện tại',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Phòng Kế Toán',
      unitCode: 1
    }
  })
  currentUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiPropertyOptional({
    description: 'RFID tag (chỉ với tài sản cố định)',
    example: {
      id: 1,
      rfid: 'A1B2C3D4E5F6'
    }
  })
  rfidTag?: {
    id: number;
    rfid: string;
  };

  @ApiPropertyOptional({
    description: 'Thông tin giao dịch tiếp nhận gần nhất',
    example: {
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      receivedAt: '2023-01-15T08:30:00Z',
      fromUnitName: 'Phòng IT',
      toUnitName: 'Phòng Kế Toán'
    }
  })
  lastReceivedTransaction?: {
    transactionId: string;
    receivedAt: Date;
    fromUnitName: string;
    toUnitName: string;
  };
}
