import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';

export class ImportAssetDto {
  @ApiProperty({ description: 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00)' })
  @IsString()
  @IsNotEmpty()
  ktCode: string;

  @ApiProperty({ description: 'Mã tài sản cố định xxxx.yyyy' })
  @IsString()
  @IsNotEmpty()
  fixedCode: string;

  @ApiProperty({ description: 'Vị trí (Room Code)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Vị trí cụ thể trong phòng' })
  @IsString()
  @IsOptional()
  locationInRoom?: string;

  @ApiProperty({ description: 'Danh mục' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Tên tài sản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Loại tài sản', enum: AssetType })
  @IsEnum(AssetType)
  @IsNotEmpty()
  type: AssetType;

  @ApiPropertyOptional({ description: 'Thông số kĩ thuật' })
  @IsString()
  @IsOptional()
  specs?: string;

  @ApiPropertyOptional({ description: 'Xuất xứ' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiProperty({ description: 'Đơn vị tính' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Số lượng', default: 1 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Ngày nhập' })
  @IsDateString()
  @IsNotEmpty()
  entrydate: string;

  @ApiProperty({ description: 'Gói mua', default: 0 })
  @IsNumber()
  @IsNotEmpty()
  purchasePackage: number;

  @ApiPropertyOptional({ description: 'Trạng thái tài sản', enum: AssetStatus, default: AssetStatus.IN_USE })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus = AssetStatus.IN_USE;

  @ApiPropertyOptional({ description: 'RFID Tag ID' })
  @IsString()
  @IsOptional()
  rfidId?: string;
}

export class ImportResultDto {
  @ApiProperty({ description: 'Tổng số dòng đã xử lý' })
  totalProcessed: number;

  @ApiProperty({ description: 'Số batch đã xử lý' })
  totalBatches: number;

  @ApiProperty({ description: 'Kích thước batch' })
  batchSize: number;

  @ApiProperty({ description: 'Số dòng thành công' })
  successCount: number;

  @ApiProperty({ description: 'Số dòng lỗi' })
  errorCount: number;

  @ApiProperty({ description: 'Danh sách lỗi' })
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;

  @ApiProperty({ description: 'Danh sách tài sản đã tạo thành công' })
  createdAssets: Array<{
    id: string;
    name: string;
    ktCode: string;
    fixedCode: string;
    type: string;
    category: string;
    rfidTag?: string;
  }>;
}
