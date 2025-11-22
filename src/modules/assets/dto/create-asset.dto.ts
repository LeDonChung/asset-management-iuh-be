import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';

export class CreateAssetDto {
  @ApiPropertyOptional({ description: 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00). Nếu để trống sẽ tự sinh.' })
  @IsString()
  @IsOptional()
  ktCode?: string;

  @ApiPropertyOptional({ description: 'Mã tài sản cố định xxxx.yyyy. Nếu để trống sẽ tự sinh.' })
  @IsString()
  @IsOptional()
  fixedCode?: string;

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

  @ApiPropertyOptional({ description: 'Vị trí cụ thể trong phòng (ví dụ: Bàn A1, Góc phòng, Kệ số 3)' })
  @IsString()
  @IsOptional()
  locationInRoom?: string;

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

  @ApiPropertyOptional({ description: 'Mã RFID (chỉ dành cho tài sản cố định)' })
  @IsString()
  @IsOptional()
  rfid?: string;

  @ApiPropertyOptional({ description: 'Trạng thái tài sản', enum: AssetStatus, default: AssetStatus.IN_USE })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus = AssetStatus.UNIDENTIFIED;
}
