import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StatisticsLevel {
  ALL = 'ALL', // Toàn bộ cơ sở
  SESSION_UNIT = 'SESSION_UNIT', // Từng cơ sở
  GROUP = 'GROUP', // Nhóm
  ASSIGNMENT = 'ASSIGNMENT', // Phân công
  ROOM = 'ROOM', // Phòng
}

export class InventoryStatisticsFilterDto {
  @ApiProperty({ 
    description: 'Mức độ thống kê', 
    enum: StatisticsLevel,
    required: false,
    default: StatisticsLevel.ALL
  })
  @IsOptional()
  @IsEnum(StatisticsLevel)
  level?: StatisticsLevel;

  @ApiProperty({ description: 'ID của cơ sở (sessionUnitId)', required: false })
  @IsOptional()
  @IsString()
  sessionUnitId?: string;

  @ApiProperty({ description: 'ID của nhóm', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: 'ID của phân công', required: false })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiProperty({ description: 'ID của phòng', required: false })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ description: 'Loại tài sản (FIXED_ASSET, TOOLS_EQUIPMENT)', required: false })
  @IsOptional()
  @IsString()
  assetType?: string;
}

