import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { BaseFilterDto } from 'src/common/dto/filter.dto';
import { AssetType } from 'src/common/shared/AssetType';

export class LiquidationProposedFilterDto extends BaseFilterDto {
  @ApiProperty({ required: false, description: 'Tìm kiếm theo tên tài sản, mã tài sản' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'ID phòng (để lọc theo phòng cụ thể)' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Loại tài sản',
    enum: AssetType,
    enumName: 'AssetType'
  })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;
}
