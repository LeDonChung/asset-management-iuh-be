import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';

export class UpdateTransactionItemDto {
  @ApiProperty({
    description: 'ID của tài sản',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({
    description: 'ID phòng hiện tại của tài sản này',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  fromRoomId?: string;

  @ApiProperty({
    description: 'ID phòng đích cho tài sản này',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  toRoomId?: string;

  @ApiProperty({
    description: 'Ghi chú cho tài sản này',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTransactionDto {
  @ApiProperty({
    description: 'ID đơn vị bàn giao',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  fromUnitId?: string;

  @ApiProperty({
    description: 'ID đơn vị tiếp nhận',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  toUnitId?: string;



  @ApiProperty({
    description: 'Ghi chú yêu cầu',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestNote?: string;

  @ApiProperty({
    description: 'Danh sách tài sản cần bàn giao',
    type: [UpdateTransactionItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionItemDto)
  items?: UpdateTransactionItemDto[];
}

export class UpdateTransactionStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới',
    enum: TransactionStatus,
    example: TransactionStatus.APPROVED,
  })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @ApiProperty({
    description: 'Ghi chú phê duyệt/từ chối',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Lý do từ chối (nếu từ chối)',
    required: false,
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiProperty({
    description: 'Ghi chú phê duyệt',
    required: false,
  })
  @IsOptional()
  @IsString()
  approvalNote?: string;
}

export class ProposeTransactionDto {
  @ApiProperty({
    description: 'Ghi chú đề xuất',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveTransactionDto {
  @ApiProperty({
    description: 'Ghi chú phê duyệt',
    required: false,
  })
  @IsOptional()
  @IsString()
  approvalNote?: string;

  @ApiProperty({
    description: 'Đường dẫn minh chứng (ảnh, file đính kèm)',
    required: false,
    example: 'https://example.com/evidence/approve-123.jpg',
  })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export class RejectTransactionDto {
  @ApiProperty({
    description: 'Lý do từ chối',
  })
  @IsString()
  rejectionReason: string;
}

export class ReceiveTransactionDto {
  @ApiProperty({
    description: 'Ghi chú khi tiếp nhận tài sản',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
