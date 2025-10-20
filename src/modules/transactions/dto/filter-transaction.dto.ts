import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsNumber, IsString } from 'class-validator';
import { TransactionType } from 'src/common/shared/TransactionType';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { BaseFilterDto } from 'src/common/dto/base-filter.dto';

export class TransactionFilterDto extends BaseFilterDto {
  @ApiProperty({
    description: 'Lọc theo loại giao dịch',
    enum: TransactionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({
    description: 'Lọc theo trạng thái giao dịch',
    enum: TransactionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({
    description: 'Lọc theo đơn vị bàn giao',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  fromUnitId?: string;

  @ApiProperty({
    description: 'Từ khóa tìm kiếm (tài sản, ghi chú, ...)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
