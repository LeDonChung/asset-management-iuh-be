import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { AssetType } from 'src/common/shared/AssetType';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class AssetBookAssetFilterDto {
  @ApiPropertyOptional({ description: 'Pagination settings' })
  @IsOptional()
  @Type(() => PaginationDto)
  pagination?: {
    currentPage?: number;
    itemsPerPage?: number;
    totalItems?: number;
    totalPages?: number;
  };

  @ApiPropertyOptional({ description: 'Campus ID' })
  @IsOptional()
  @IsString()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Unit ID' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ description: 'Year' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ description: 'Room ID' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Asset Type', enum: AssetType })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;
}
