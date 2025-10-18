import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AssetResponseDto } from 'src/modules/assets/dto/asset-response.dto';

export class LiquidationProposedInventoryResultDto {
  @ApiProperty({ description: 'ID của kết quả kiểm kê' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Số lượng trên hệ thống' })
  @Expose()
  systemQuantity: number;

  @ApiProperty({ description: 'Số lượng thực tế kiểm kê' })
  @Expose()
  countedQuantity: number;

  @ApiProperty({ description: 'Ghi chú' })
  @Expose()
  note: string;

  @ApiProperty({ description: 'Phương pháp quét' })
  @Expose()
  scanMethod: string;

  @ApiProperty({ description: 'Trạng thái' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Ngày tạo' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Thông tin tài sản', type: AssetResponseDto })
  @Expose()
  @Type(() => AssetResponseDto)
  asset: AssetResponseDto;

  @ApiProperty({ description: 'Thông tin phòng' })
  @Expose()
  room: {
    id: string;
    name: string;
    code: string;
  };

  @ApiProperty({ description: 'Thông tin kỳ kiểm kê' })
  @Expose()
  inventorySession: {
    id: string;
    name: string;
    year: number;
  };

  @ApiProperty({ description: 'Danh sách hình ảnh minh chứng' })
  @Expose()
  fileUrls?: {
    id: string;
    url: string;
    createdAt: Date;
  }[];
}
