import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AssetStatsByStatus {
  @ApiProperty({ description: 'Trạng thái tài sản' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Số lượng tài sản' })
  @Expose()
  count: number;

  @ApiProperty({ description: 'Phần trăm' })
  @Expose()
  percentage: number;
}

export class AssetStatsByCategory {
  @ApiProperty({ description: 'ID danh mục' })
  @Expose()
  categoryId: string;

  @ApiProperty({ description: 'Tên danh mục' })
  @Expose()
  categoryName: string;

  @ApiProperty({ description: 'Số lượng tài sản' })
  @Expose()
  count: number;

  @ApiProperty({ description: 'Phần trăm' })
  @Expose()
  percentage: number;
}

export class AssetStatsByType {
  @ApiProperty({ description: 'Loại tài sản' })
  @Expose()
  type: string;

  @ApiProperty({ description: 'Số lượng tài sản' })
  @Expose()
  count: number;

  @ApiProperty({ description: 'Phần trăm' })
  @Expose()
  percentage: number;
}

export class TopLocation {
  @ApiProperty({ description: 'ID phòng' })
  @Expose()
  roomId: string;

  @ApiProperty({ description: 'Tên phòng' })
  @Expose()
  roomName: string;

  @ApiProperty({ description: 'Mã phòng' })
  @Expose()
  roomCode: string;

  @ApiProperty({ description: 'Số lượng tài sản' })
  @Expose()
  assetCount: number;
}

export class UnitStatistics {
  @ApiProperty({ description: 'ID đơn vị' })
  @Expose()
  unitId: string;

  @ApiProperty({ description: 'Tên đơn vị' })
  @Expose()
  unitName: string;

  @ApiProperty({ description: 'Mã đơn vị' })
  @Expose()
  unitCode: number;

  @ApiProperty({ description: 'Tổng số tài sản' })
  @Expose()
  totalAssets: number;

  @ApiProperty({ description: 'Số tài sản cố định' })
  @Expose()
  fixedAssets: number;

  @ApiProperty({ description: 'Số công cụ dụng cụ' })
  @Expose()
  toolsEquipment: number;

  @ApiProperty({ description: 'Số tài sản đang sử dụng' })
  @Expose()
  inUseAssets: number;

  @ApiProperty({ description: 'Số tài sản hư hỏng' })
  @Expose()
  damagedAssets: number;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'ID hoạt động' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Loại hoạt động: create, update, transaction, movement, liquidation, inventory' })
  @Expose()
  type: string;

  @ApiProperty({ description: 'Tiêu đề hoạt động' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết' })
  @Expose()
  description: string;

  @ApiProperty({ description: 'Tên người thực hiện' })
  @Expose()
  userName: string;

  @ApiProperty({ description: 'ID người thực hiện' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Thời gian thực hiện' })
  @Expose()
  createdAt: Date;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Tổng số tài sản' })
  @Expose()
  totalAssets: number;

  @ApiProperty({ description: 'Số tài sản cố định' })
  @Expose()
  fixedAssets: number;

  @ApiProperty({ description: 'Số công cụ dụng cụ' })
  @Expose()
  toolsEquipment: number;

  @ApiProperty({ description: 'Số tài sản đang sử dụng' })
  @Expose()
  inUseAssets: number;

  @ApiProperty({ description: 'Số tài sản hư hỏng' })
  @Expose()
  damagedAssets: number;

  @ApiProperty({ description: 'Số tài sản bị mất' })
  @Expose()
  lostAssets: number;

  @ApiProperty({ description: 'Số tài sản đề xuất thanh lý' })
  @Expose()
  proposedLiquidationAssets: number;

  @ApiProperty({ description: 'Số tài sản đã thanh lý' })
  @Expose()
  liquidatedAssets: number;

  @ApiProperty({ description: 'Số tài sản chưa định danh' })
  @Expose()
  unidentifiedAssets: number;

  @ApiProperty({ description: 'Số giao dịch đang chờ' })
  @Expose()
  pendingTransactions: number;

  @ApiProperty({ description: 'Số giao dịch đã duyệt' })
  @Expose()
  approvedTransactions: number;

  @ApiProperty({ description: 'Số giao dịch đã hoàn thành' })
  @Expose()
  completedTransactions: number;

  @ApiProperty({ description: 'Số di chuyển đang chờ' })
  @Expose()
  pendingMovements: number;

  @ApiProperty({ description: 'Số di chuyển đã hoàn thành' })
  @Expose()
  completedMovements: number;

  @ApiProperty({ description: 'Thống kê theo trạng thái', type: [AssetStatsByStatus] })
  @Expose()
  assetsByStatus: AssetStatsByStatus[];

  @ApiProperty({ description: 'Thống kê theo danh mục', type: [AssetStatsByCategory] })
  @Expose()
  assetsByCategory: AssetStatsByCategory[];

  @ApiProperty({ description: 'Thống kê theo loại tài sản', type: [AssetStatsByType] })
  @Expose()
  assetsByType: AssetStatsByType[];

  @ApiProperty({ description: 'Top 10 vị trí có nhiều tài sản nhất', type: [TopLocation] })
  @Expose()
  topLocations: TopLocation[];

  @ApiProperty({ description: 'Thống kê theo đơn vị', type: [UnitStatistics] })
  @Expose()
  unitStatistics: UnitStatistics[];

  @ApiProperty({ description: 'Hoạt động gần đây', type: [RecentActivityDto] })
  @Expose()
  recentActivities: RecentActivityDto[];
}

