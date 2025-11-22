import { IsOptional, IsEnum, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MoveStatus } from 'src/common/shared/MoveStatus';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BaseFilterDto } from 'src/common/dto/base-filter.dto';

export class MovementFilterDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Lọc theo trạng thái di chuyển',
    enum: MoveStatus
  })
  @IsOptional()
  @IsEnum(MoveStatus)
  status?: MoveStatus;

  @ApiPropertyOptional({ description: 'Lọc theo ID người yêu cầu' })
  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID người phê duyệt' })
  @IsOptional()
  @IsUUID()
  approverId?: string;

  @ApiPropertyOptional({ description: 'Lọc từ ngày tạo' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Lọc đến ngày tạo' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo ghi chú' })
  @IsOptional()
  @IsString()
  searchNote?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID phòng nguồn' })
  @IsOptional()
  @IsUUID()
  fromRoomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID phòng đích' })
  @IsOptional()
  @IsUUID()
  toRoomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mã tài sản' })
  @IsOptional()
  @IsString()
  assetCode?: string;
}

export class SimplifiedMovementFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ 
    description: 'Lọc theo trạng thái di chuyển',
    enum: MoveStatus
  })
  @IsOptional()
  @IsEnum(MoveStatus)
  status?: MoveStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo ghi chú' })
  @IsOptional()
  @IsString()
  searchNote?: string;
}