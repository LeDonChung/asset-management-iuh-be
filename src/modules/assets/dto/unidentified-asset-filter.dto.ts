import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from 'src/common/shared/AssetType';
import { BaseFilterDto } from 'src/common/dto/base-filter.dto';

export class UnidentifiedAssetFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại tài sản',
    enum: AssetType,
    example: AssetType.FIXED_ASSET
  })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;
}

