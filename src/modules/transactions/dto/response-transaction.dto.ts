import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { TransactionType } from 'src/common/shared/TransactionType';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';

export class TransactionItemResponseDto {
  @ApiProperty({
    description: 'ID của item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID giao dịch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  transactionId: string;

  @ApiProperty({
    description: 'ID tài sản',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  assetId: string;

  @ApiProperty({
    description: 'ID phòng hiện tại của tài sản',
  })
  @Expose()
  fromRoomId?: string;

  @ApiProperty({
    description: 'ID phòng đích cho tài sản',
  })
  @Expose()
  toRoomId?: string;

  @ApiProperty({
    description: 'Thông tin tài sản',
  })
  @Expose()
  @Type(() => Object)
  asset: {
    id: string;
    name: string;
    fixedCode: string;
    ktCode: string;
    type: string;
    status: string;
    currentRoom?: {
      id: string;
      name: string;
      roomCode: string;
    };
  };

  @ApiProperty({
    description: 'Phòng hiện tại của tài sản',
  })
  @Expose()
  @Type(() => Object)
  fromRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiProperty({
    description: 'Phòng đích cho tài sản',
  })
  @Expose()
  @Type(() => Object)
  toRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiProperty({
    description: 'Ghi chú cho tài sản',
  })
  @Expose()
  note?: string;

  @ApiProperty({
    description: 'Ngày tạo',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Ngày cập nhật',
  })
  @Expose()
  updatedAt: Date;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({
    description: 'ID của lịch sử',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID giao dịch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  transactionId: string;

  @ApiProperty({
    description: 'Trạng thái giao dịch cũ',
    enum: TransactionStatus,
  })
  @Expose()
  oldStatus: TransactionStatus;

  @ApiProperty({
    description: 'Trạng thái giao dịch mới',
    enum: TransactionStatus,
  })
  @Expose()
  newStatus: TransactionStatus;

  @ApiProperty({
    description: 'Người thay đổi',
  })
  @Expose()
  @Type(() => Object)
  changer: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiProperty({
    description: 'Ghi chú thay đổi',
  })
  @Expose()
  note?: string;

  @ApiProperty({
    description: 'Đường dẫn minh chứng (nếu có)',
  })
  @Expose()
  evidenceUrl?: string;

  @ApiProperty({
    description: 'Ngày tạo',
  })
  @Expose()
  createdAt: Date;
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'ID của giao dịch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Loại giao dịch',
    enum: TransactionType,
  })
  @Expose()
  type: TransactionType;

  @ApiProperty({
    description: 'Đơn vị bàn giao',
  })
  @Expose()
  @Type(() => Object)
  fromUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiProperty({
    description: 'Đơn vị tiếp nhận',
  })
  @Expose()
  @Type(() => Object)
  toUnit: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiProperty({
    description: 'Người yêu cầu',
  })
  @Expose()
  @Type(() => Object)
  requester: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiProperty({
    description: 'Người phê duyệt',
  })
  @Expose()
  @Type(() => Object)
  approver?: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiProperty({
    description: 'Người bàn giao',
  })
  @Expose()
  @Type(() => Object)
  handover?: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiProperty({
    description: 'Người tiếp nhận',
  })
  @Expose()
  @Type(() => Object)
  receiver?: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiProperty({
    description: 'Trạng thái giao dịch',
    enum: TransactionStatus,
  })
  @Expose()
  status: TransactionStatus;

  @ApiProperty({
    description: 'Ghi chú yêu cầu',
  })
  @Expose()
  requestNote?: string;

  @ApiProperty({
    description: 'Ghi chú phê duyệt',
  })
  @Expose()
  approvalNote?: string;

  @ApiProperty({
    description: 'Lý do từ chối',
  })
  @Expose()
  rejectionReason?: string;

  @ApiProperty({
    description: 'Danh sách tài sản',
    type: [TransactionItemResponseDto],
  })
  @Expose()
  @Type(() => TransactionItemResponseDto)
  items: TransactionItemResponseDto[];

  @ApiProperty({
    description: 'Lịch sử giao dịch',
    type: [TransactionHistoryResponseDto],
  })
  @Expose()
  @Type(() => TransactionHistoryResponseDto)
  histories?: TransactionHistoryResponseDto[];

  @ApiProperty({
    description: 'Ngày tạo',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Ngày cập nhật',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'Tổng số tài sản',
  })
  @Expose()
  @Transform(({ obj }) => obj.items?.length || 0)
  totalAssets: number;
}

export class SimplifiedTransactionResponseDto {
  @ApiProperty({
    description: 'ID của giao dịch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Loại giao dịch',
    enum: TransactionType,
  })
  @Expose()
  type: TransactionType;

  @ApiProperty({
    description: 'Đơn vị bàn giao',
  })
  @Expose()
  @Transform(({ obj }) => obj.fromUnit?.name || 'N/A')
  fromUnitName: string;

  @ApiProperty({
    description: 'Đơn vị tiếp nhận',
  })
  @Expose()
  @Transform(({ obj }) => obj.toUnit?.name || 'N/A')
  toUnitName: string;

  @ApiProperty({
    description: 'Trạng thái giao dịch',
    enum: TransactionStatus,
  })
  @Expose()
  status: TransactionStatus;

  @ApiProperty({
    description: 'Tổng số tài sản',
  })
  @Expose()
  @Transform(({ obj }) => obj.items?.length || 0)
  totalAssets: number;

  @ApiProperty({
    description: 'Người yêu cầu',
  })
  @Expose()
  @Transform(({ obj }) => obj.requester?.fullName || 'N/A')
  requesterName: string;

  @ApiProperty({
    description: 'Ngày tạo',
  })
  @Expose()
  createdAt: Date;
}
