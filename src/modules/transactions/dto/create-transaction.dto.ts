import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
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
    description: 'Ghi chú cho tài sản này',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'ID đơn vị bàn giao',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  fromUnitId: string;

  @ApiProperty({
    description: 'ID đơn vị tiếp nhận',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  toUnitId: string;

  @ApiProperty({
    description: 'Trạng thái yêu cầu bàn giao',
    enum: TransactionStatus,
    example: TransactionStatus.DRAFT,
    default: TransactionStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({
    description: 'Ghi chú yêu cầu',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestNote?: string;

  @ApiProperty({
    description: 'Danh sách tài sản cần bàn giao',
    type: [CreateTransactionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];
}
