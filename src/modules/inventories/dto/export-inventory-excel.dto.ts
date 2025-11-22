import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { AssetType } from 'src/common/shared/AssetType';

export class ExportInventoryExcelDto {
  @ApiProperty({ description: 'ID của phòng kiểm kê' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({ 
    description: 'ID của phân công kiểm kê (optional, dùng khi export theo phân công cụ thể)',
    type: String 
  })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiPropertyOptional({ 
    description: 'Loại tài sản cần export',
    enum: AssetType,
    example: AssetType.FIXED_ASSET 
  })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @ApiPropertyOptional({ 
    description: 'Danh sách trạng thái cần export',
    type: [String],
    example: ['MATCHED', 'MISSING'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statusFilter?: string[];

  @ApiPropertyOptional({ 
    description: 'Tên file Excel (không bao gồm extension)',
    example: 'Ket_qua_kiem_ke_phong_101' 
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'Có bao gồm hình ảnh trong file Excel hay không',
    default: false 
  })
  @IsOptional()
  includeImages?: boolean;
}

export class ExportMultiRoomInventoryExcelDto {
  @ApiProperty({ description: 'ID của đơn vị kiểm kê' })
  @IsString()
  unitId: string;

  @ApiPropertyOptional({ 
    description: 'ID của phân công kiểm kê (optional, dùng khi export theo phân công cụ thể)',
    type: String 
  })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiPropertyOptional({ 
    description: 'Danh sách ID phòng cần export (optional, nếu không có sẽ export tất cả phòng)',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roomIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Loại tài sản cần export',
    enum: AssetType 
  })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @ApiPropertyOptional({ 
    description: 'Danh sách trạng thái cần export',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statusFilter?: string[];

  @ApiPropertyOptional({ 
    description: 'Tên file Excel (không bao gồm extension)',
    example: 'Ket_qua_kiem_ke_don_vi_CNTT' 
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'Có bao gồm hình ảnh trong file Excel hay không',
    default: false 
  })
  @IsOptional()
  includeImages?: boolean;
}
