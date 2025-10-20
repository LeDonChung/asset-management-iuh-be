import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from 'src/common/shared/TransactionType';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';

export class CreateTransactionItemDto {
  @ApiProperty({
    description: 'ID của tài sản',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  assetId: string;

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

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Loại giao dịch',
    enum: TransactionType,
    example: TransactionType.TRANSFER,
  })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'ID đơn vị bàn giao (null nếu là allocation)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  fromUnitId?: string;

  @ApiProperty({
    description: 'ID đơn vị tiếp nhận',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  toUnitId: string;

  @ApiProperty({
    description: 'Ghi chú yêu cầu',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestNote?: string;

  @ApiProperty({
    description: 'Trạng thái giao dịch',
    enum: TransactionStatus,
    required: false,
    default: TransactionStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({
    description: 'Danh sách tài sản cần bàn giao',
    type: [CreateTransactionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];
}
