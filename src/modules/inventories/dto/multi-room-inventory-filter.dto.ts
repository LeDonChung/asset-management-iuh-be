import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class MultiRoomInventoryFilterDto {
  @ApiProperty({ 
    description: 'ID phân công kiểm kê', 
    required: false,
    example: 'uuid-assignment-id'
  })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({ 
    description: 'ID kỳ kiểm kê', 
    required: false,
    example: 'uuid-session-id'
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ 
    description: 'ID đơn vị', 
    required: false,
    example: 'uuid-unit-id'
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ 
    description: 'Số trang', 
    required: false, 
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Kích thước trang', 
    required: false, 
    default: 5,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsPositive()
  limit?: number = 5;

  @ApiProperty({ 
    description: 'Từ khóa tìm kiếm tên phòng', 
    required: false,
    example: 'H5.01'
  })
  @IsOptional()
  search?: string;

  @ApiProperty({ 
    description: 'Loại tài sản', 
    required: false,
    enum: ['FIXED_ASSET', 'TOOLS_EQUIPMENT', 'ALL'],
    example: 'FIXED_ASSET'
  })
  @IsOptional()
  assetType?: string;
}
