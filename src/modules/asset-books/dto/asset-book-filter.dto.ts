import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, IsUUID } from 'class-validator';
import { BaseFilterDto } from 'src/common/dto/base-filter.dto';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetBookItemStatus } from 'src/common/shared/AssetBookItemStatus';

export class AssetBookFilterDto extends BaseFilterDto {

  @ApiPropertyOptional({ description: 'Campus ID (Cơ sở)' })
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Unit ID (Đơn vị sử dụng)' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ description: 'Year (Năm)' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: 'Room ID (Phòng)' })
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ 
    description: 'Asset Type (Loại tài sản)',
    enum: AssetType
  })
  @IsOptional()
  @IsEnum(AssetType)
  assetType: AssetType;

  @ApiPropertyOptional({ 
    description: 'Status in Asset Book (Trạng thái trong sổ)',
    enum: AssetBookItemStatus
  })
  @IsOptional()
  @IsEnum(AssetBookItemStatus)
  status?: AssetBookItemStatus;

}
