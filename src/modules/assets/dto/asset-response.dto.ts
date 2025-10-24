import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AssetStatus } from 'src/common/shared/AssetStatus';
import { AssetType } from 'src/common/shared/AssetType';
import { CategoryResponseDto } from 'src/modules/categories/dto/category-response.dto';
import { RoomResponseDto } from 'src/modules/rooms/dto/room-response.dto';
import { RfidTagResponseDto } from './rfid-tag-response.dto';
import { TransactionItemAssetResponseDto } from './transaction-item-response.dto';

export class AssetResponseDto {
  @ApiProperty({ description: 'Asset ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Mã kế toán' })
  @Expose()
  ktCode: string;

  @ApiProperty({ description: 'Mã tài sản cố định' })
  @Expose()
  fixedCode: string;

  @ApiProperty({ description: 'Tên tài sản' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Thông số kĩ thuật' })
  @Expose()
  specs?: string;

  @ApiProperty({ description: 'Ngày nhập' })
  @Expose()
  entrydate: Date;

  @ApiPropertyOptional({ description: 'Mã vị trí hiện tại' })
  @Expose()
  currentRoomId?: string;

  @ApiProperty({ description: 'Đơn vị tính' })
  @Expose()
  unit: string;

  @ApiProperty({ description: 'Số lượng' })
  @Expose()
  quantity: number;

  @ApiPropertyOptional({ description: 'Xuất xứ' })
  @Expose()
  origin?: string;

  @ApiProperty({ description: 'Gói mua' })
  @Expose()
  purchasePackage: number;

  @ApiProperty({ description: 'Loại tài sản', enum: AssetType })
  @Expose()
  type: AssetType;

  @ApiProperty({ description: 'Danh mục ID' })
  @Expose()
  categoryId: string;

  @ApiProperty({ description: 'Trạng thái tài sản', enum: AssetStatus })
  @Expose()
  status: AssetStatus;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  // Relations
  @ApiPropertyOptional({ description: 'Category information' })
  @Type(() => CategoryResponseDto)
  @Expose()
  category?: CategoryResponseDto;

  @ApiPropertyOptional({ description: 'Current room information' })
  @Type(() => RoomResponseDto)
  @Expose()
  currentRoom?: RoomResponseDto;

  @ApiPropertyOptional({ description: 'RFID tag information (only for Fixed Assets)' })
  @Type(() => RfidTagResponseDto)
  @Expose()
  rfidTag?: RfidTagResponseDto;

  @ApiPropertyOptional({ description: 'Danh sách các mục giao dịch liên quan đến tài sản' })
  @Type(() => TransactionItemAssetResponseDto)
  @Expose()
  transactionItems ?: TransactionItemAssetResponseDto[];
}
