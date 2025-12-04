import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { MoveStatus } from 'src/common/shared/MoveStatus';
import { LiquidationStatus } from 'src/common/shared/LiquidationStatus';

// Base history item that all history types extend
export class BaseHistoryItemDto {
  @ApiProperty({ description: 'ID của bản ghi lịch sử' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Loại lịch sử: TRANSACTION, MOVEMENT, LIQUIDATION' })
  @Expose()
  type: 'TRANSACTION' | 'MOVEMENT' | 'LIQUIDATION';

  @ApiProperty({ description: 'Thời gian tạo' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Người thực hiện' })
  @Expose()
  @Type(() => Object)
  user: {
    id: string;
    fullName: string;
    username: string;
  };

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @Expose()
  note?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn minh chứng' })
  @Expose()
  evidenceUrl?: string;
}

// Transaction history item
export class TransactionHistoryItemDto extends BaseHistoryItemDto {
  @ApiProperty({ description: 'Loại lịch sử', default: 'TRANSACTION' })
  @Expose()
  type: 'TRANSACTION';

  @ApiProperty({ description: 'ID của giao dịch' })
  @Expose()
  transactionId: string;

  @ApiProperty({ description: 'Trạng thái cũ', enum: TransactionStatus })
  @Expose()
  oldStatus: TransactionStatus;

  @ApiProperty({ description: 'Trạng thái mới', enum: TransactionStatus })
  @Expose()
  newStatus: TransactionStatus;

  @ApiPropertyOptional({ description: 'Phòng xuất phát' })
  @Expose()
  @Type(() => Object)
  fromRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiPropertyOptional({ description: 'Phòng đích' })
  @Expose()
  @Type(() => Object)
  toRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiPropertyOptional({ description: 'Đơn vị gửi' })
  @Expose()
  @Type(() => Object)
  fromUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiPropertyOptional({ description: 'Đơn vị nhận' })
  @Expose()
  @Type(() => Object)
  toUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };
}

// Movement history item
export class MovementHistoryItemDto extends BaseHistoryItemDto {
  @ApiProperty({ description: 'Loại lịch sử', default: 'MOVEMENT' })
  @Expose()
  type: 'MOVEMENT';

  @ApiProperty({ description: 'ID của di chuyển' })
  @Expose()
  movementId: string;

  @ApiPropertyOptional({ description: 'Trạng thái cũ', enum: MoveStatus })
  @Expose()
  oldStatus?: MoveStatus;

  @ApiProperty({ description: 'Trạng thái mới', enum: MoveStatus })
  @Expose()
  newStatus: MoveStatus;

  @ApiPropertyOptional({ description: 'Phòng xuất phát' })
  @Expose()
  @Type(() => Object)
  fromRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiPropertyOptional({ description: 'Phòng đích' })
  @Expose()
  @Type(() => Object)
  toRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiPropertyOptional({ description: 'Đơn vị xuất phát' })
  @Expose()
  @Type(() => Object)
  fromUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiPropertyOptional({ description: 'Đơn vị đích' })
  @Expose()
  @Type(() => Object)
  toUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };
}

// Liquidation history item
export class LiquidationHistoryItemDto extends BaseHistoryItemDto {
  @ApiProperty({ description: 'Loại lịch sử', default: 'LIQUIDATION' })
  @Expose()
  type: 'LIQUIDATION';

  @ApiProperty({ description: 'ID của đề xuất thanh lý' })
  @Expose()
  proposalId: string;

  @ApiProperty({ description: 'Trạng thái', enum: LiquidationStatus })
  @Expose()
  actionStatus: LiquidationStatus;
}

// Combined response
export class AssetHistoryResponseDto {
  @ApiProperty({ description: 'ID của tài sản' })
  @Expose()
  assetId: string;

  @ApiProperty({ description: 'Lịch sử giao dịch', type: [TransactionHistoryItemDto] })
  @Expose()
  @Type(() => TransactionHistoryItemDto)
  transactions: TransactionHistoryItemDto[];

  @ApiProperty({ description: 'Lịch sử di chuyển', type: [MovementHistoryItemDto] })
  @Expose()
  @Type(() => MovementHistoryItemDto)
  movements: MovementHistoryItemDto[];

  @ApiProperty({ description: 'Lịch sử thanh lý', type: [LiquidationHistoryItemDto] })
  @Expose()
  @Type(() => LiquidationHistoryItemDto)
  liquidations: LiquidationHistoryItemDto[];

  @ApiProperty({ description: 'Tất cả lịch sử được sắp xếp theo thời gian', type: [BaseHistoryItemDto] })
  @Expose()
  all: (TransactionHistoryItemDto | MovementHistoryItemDto | LiquidationHistoryItemDto)[];
}

