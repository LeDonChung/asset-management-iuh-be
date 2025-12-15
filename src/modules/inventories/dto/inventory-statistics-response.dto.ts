import { ApiProperty } from '@nestjs/swagger';
import { StatisticsLevel } from './inventory-statistics-filter.dto';

export class StatusStatisticsDto {
  @ApiProperty({ description: 'Số lượng khớp' })
  matched: number;

  @ApiProperty({ description: 'Số lượng thiếu' })
  missing: number;

  @ApiProperty({ description: 'Số lượng thừa' })
  excess: number;

  @ApiProperty({ description: 'Số lượng hỏng' })
  broken: number;

  @ApiProperty({ description: 'Số lượng cần sửa chữa' })
  needsRepair: number;

  @ApiProperty({ description: 'Số lượng đề xuất thanh lý' })
  liquidationProposed: number;
}

export class AssetTypeStatisticsDto {
  @ApiProperty({ description: 'Số lượng tài sản cố định' })
  fixedAssets: number;

  @ApiProperty({ description: 'Số lượng công cụ dụng cụ' })
  toolsEquipment: number;
}

export class ScanMethodStatisticsDto {
  @ApiProperty({ description: 'Số lượng quét bằng RFID' })
  rfid: number;

  @ApiProperty({ description: 'Số lượng quét thủ công' })
  manual: number;
}

export class LevelStatisticsItemDto {
  @ApiProperty({ description: 'ID của đơn vị thống kê' })
  id: string;

  @ApiProperty({ description: 'Tên đơn vị thống kê' })
  name: string;

  @ApiProperty({ description: 'Tổng số tài sản' })
  totalAssets: number;

  @ApiProperty({ description: 'Thống kê theo trạng thái', type: StatusStatisticsDto })
  statusStatistics: StatusStatisticsDto;

  @ApiProperty({ description: 'Thống kê theo loại tài sản', type: AssetTypeStatisticsDto })
  assetTypeStatistics: AssetTypeStatisticsDto;

  @ApiProperty({ description: 'Thống kê theo phương pháp quét', type: ScanMethodStatisticsDto })
  scanMethodStatistics: ScanMethodStatisticsDto;
}

export class InventoryStatisticsResponseDto {
  @ApiProperty({ description: 'Mức độ thống kê', enum: StatisticsLevel })
  level: StatisticsLevel;

  @ApiProperty({ description: 'Tổng số tài sản' })
  totalAssets: number;

  @ApiProperty({ description: 'Thống kê tổng quan theo trạng thái', type: StatusStatisticsDto })
  overallStatusStatistics: StatusStatisticsDto;

  @ApiProperty({ description: 'Thống kê tổng quan theo loại tài sản', type: AssetTypeStatisticsDto })
  overallAssetTypeStatistics: AssetTypeStatisticsDto;

  @ApiProperty({ description: 'Thống kê tổng quan theo phương pháp quét', type: ScanMethodStatisticsDto })
  overallScanMethodStatistics: ScanMethodStatisticsDto;

  @ApiProperty({ 
    description: 'Thống kê chi tiết theo từng đơn vị (cơ sở/nhóm/phân công/phòng)', 
    type: [LevelStatisticsItemDto] 
  })
  levelStatistics: LevelStatisticsItemDto[];
}

