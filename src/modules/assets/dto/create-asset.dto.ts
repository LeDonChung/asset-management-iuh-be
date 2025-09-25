import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';

export class CreateAssetDto {
  @ApiProperty({ description: 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00)' })
  @IsString()
  @IsNotEmpty()
  ktCode: string;

  @ApiProperty({ description: 'Mã tài sản cố định xxxx.yyyy' })
  @IsString()
  @IsNotEmpty()
  fixedCode: string;

  @ApiProperty({ description: 'Tên tài sản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Thông số kĩ thuật' })
  @IsString()
  @IsOptional()
  specs?: string;

  @ApiProperty({ description: 'Ngày nhập' })
  @IsDateString()
  @IsNotEmpty()
  entrydate: string;

  @ApiPropertyOptional({ description: 'Mã vị trí hiện tại' })
  @IsUUID()
  @IsOptional()
  currentRoomId?: string;

  @ApiProperty({ description: 'Đơn vị tính' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Số lượng: Với tài sản cố định = 1', default: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({ description: 'Xuất xứ' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiProperty({ description: 'Gói mua', default: 0 })
  @IsNumber()
  @IsOptional()
  purchasePackage?: number = 0;

  @ApiProperty({ description: 'Loại tài sản', enum: AssetType })
  @IsEnum(AssetType)
  @IsNotEmpty()
  type: AssetType;

  @ApiProperty({ description: 'Danh mục' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Trạng thái tài sản', enum: AssetStatus, default: AssetStatus.WAITING_ALLOCATION })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus = AssetStatus.WAITING_ALLOCATION;
}
