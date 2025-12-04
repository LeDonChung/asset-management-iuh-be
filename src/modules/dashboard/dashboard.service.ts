import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from 'src/entities/asset.entity';
import { AssetTransaction } from 'src/entities/asset-transaction.entity';
import { AssetMovement } from 'src/entities/asset-movement.entity';
import { User } from 'src/entities/user.entity';
import { DashboardStatsDto, RecentActivityDto, AssetStatsByStatus, AssetStatsByCategory, AssetStatsByType, TopLocation, UnitStatistics } from './dto/dashboard-stats.dto';
import { AssetStatus } from 'src/common/shared/AssetStatus';
import { AssetType } from 'src/common/shared/AssetType';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { MoveStatus } from 'src/common/shared/MoveStatus';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetTransaction)
    private readonly transactionRepository: Repository<AssetTransaction>,
    @InjectRepository(AssetMovement)
    private readonly movementRepository: Repository<AssetMovement>,
    private readonly permissionHelper: PermissionHelperService,
  ) {}

  async getDashboardStats(currentUser: User): Promise<DashboardStatsDto> {
    // Build base query with user permissions
    const baseQuery = this.assetRepository.createQueryBuilder('asset');
    
    // Apply permission filters
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        baseQuery
          .leftJoin('asset.currentRoom', 'room')
          .leftJoin('room.unit', 'unit')
          .where('unit.id IN (:...unitIds)', { unitIds });
      } else {
        // User has no units, return empty stats
        return this.getEmptyStats();
      }
    }

    // Get total counts
    const totalAssets = await baseQuery.getCount();

    // Count by type
    const typeQuery = baseQuery.clone();
    const assetsByTypeRaw = await typeQuery
      .select('asset.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.type')
      .getRawMany();

    const fixedAssets = assetsByTypeRaw.find(t => t.type === AssetType.FIXED_ASSET)?.count || 0;
    const toolsEquipment = assetsByTypeRaw.find(t => t.type === AssetType.TOOLS_EQUIPMENT)?.count || 0;

    // Count by status
    const statusQuery = baseQuery.clone();
    const assetsByStatusRaw = await statusQuery
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();

    const inUseAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.IN_USE)?.count || 0;
    const damagedAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.DAMAGED)?.count || 0;
    const lostAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.LOST)?.count || 0;
    const proposedLiquidationAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.PROPOSED_LIQUIDATION)?.count || 0;
    const liquidatedAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.LIQUIDATED)?.count || 0;
    const unidentifiedAssets = assetsByStatusRaw.find(s => s.status === AssetStatus.UNIDENTIFIED)?.count || 0;

    // Format assets by status with percentage
    const assetsByStatus: AssetStatsByStatus[] = assetsByStatusRaw.map(item => ({
      status: item.status,
      count: parseInt(item.count),
      percentage: totalAssets > 0 ? Math.round((parseInt(item.count) / totalAssets) * 100) : 0,
    }));

    // Format assets by type with percentage
    const assetsByType: AssetStatsByType[] = assetsByTypeRaw.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      percentage: totalAssets > 0 ? Math.round((parseInt(item.count) / totalAssets) * 100) : 0,
    }));

    // Get assets by category
    const categoryQuery = baseQuery.clone();
    const assetsByCategoryRaw = await categoryQuery
      .leftJoin('asset.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    const assetsByCategory: AssetStatsByCategory[] = assetsByCategoryRaw.map(item => ({
      categoryId: item.categoryId || 'unknown',
      categoryName: item.categoryName || 'Chưa phân loại',
      count: parseInt(item.count),
      percentage: totalAssets > 0 ? Math.round((parseInt(item.count) / totalAssets) * 100) : 0,
    }));

    // Get top locations
    const locationQuery = baseQuery.clone();
    const topLocationsRaw = await locationQuery
      .leftJoin('asset.currentRoom', 'location')
      .select('location.id', 'roomId')
      .addSelect('location.name', 'roomName')
      .addSelect('location.roomCode', 'roomCode')
      .addSelect('COUNT(*)', 'assetCount')
      .where('location.id IS NOT NULL')
      .groupBy('location.id')
      .addGroupBy('location.name')
      .addGroupBy('location.roomCode')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const topLocations: TopLocation[] = topLocationsRaw.map(item => ({
      roomId: item.roomId,
      roomName: item.roomName,
      roomCode: item.roomCode,
      assetCount: parseInt(item.assetCount),
    }));

    // Get transaction counts
    const transactionBaseQuery = this.transactionRepository.createQueryBuilder('transaction');
    
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        transactionBaseQuery.where(
          '(transaction.fromUnitId IN (:...unitIds) OR transaction.toUnitId IN (:...unitIds))',
          { unitIds }
        );
      }
    }

    const pendingTransactions = await transactionBaseQuery.clone()
      .where('transaction.status = :status', { status: TransactionStatus.PROPOSED })
      .getCount();

    const approvedTransactions = await transactionBaseQuery.clone()
      .where('transaction.status = :status', { status: TransactionStatus.APPROVED })
      .getCount();

    const completedTransactions = await transactionBaseQuery.clone()
      .where('transaction.status = :status', { status: TransactionStatus.RECEIVED })
      .getCount();

    // Get movement counts
    const movementBaseQuery = this.movementRepository.createQueryBuilder('movement');
    
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        movementBaseQuery
          .leftJoin('movement.items', 'movementItems')
          .leftJoin('movementItems.fromRoom', 'fromRoom')
          .leftJoin('fromRoom.unit', 'fromUnit')
          .leftJoin('movementItems.toRoom', 'toRoom')
          .leftJoin('toRoom.unit', 'toUnit')
          .where(
            '(fromUnit.id IN (:...unitIds) OR toUnit.id IN (:...unitIds))',
            { unitIds }
          );
      }
    }

    const pendingMovements = await movementBaseQuery.clone()
      .where('movement.status = :status', { status: MoveStatus.PENDING_APPROVAL })
      .getCount();

    const completedMovements = await movementBaseQuery.clone()
      .where('movement.status = :status', { status: MoveStatus.COMPLETED })
      .getCount();

    // Get unit statistics
    const unitStatistics = await this.getUnitStatistics(currentUser);

    // Get recent activities
    const recentActivities = await this.getRecentActivities(currentUser);

    return {
      totalAssets,
      fixedAssets: parseInt(fixedAssets.toString()),
      toolsEquipment: parseInt(toolsEquipment.toString()),
      inUseAssets: parseInt(inUseAssets.toString()),
      damagedAssets: parseInt(damagedAssets.toString()),
      lostAssets: parseInt(lostAssets.toString()),
      proposedLiquidationAssets: parseInt(proposedLiquidationAssets.toString()),
      liquidatedAssets: parseInt(liquidatedAssets.toString()),
      unidentifiedAssets: parseInt(unidentifiedAssets.toString()),
      pendingTransactions,
      approvedTransactions,
      completedTransactions,
      pendingMovements,
      completedMovements,
      assetsByStatus,
      assetsByCategory,
      assetsByType,
      topLocations,
      unitStatistics,
      recentActivities,
    };
  }

  private async getUnitStatistics(currentUser: User): Promise<UnitStatistics[]> {
    // Build query to get assets grouped by unit
    const query = this.assetRepository.createQueryBuilder('asset')
      .leftJoin('asset.currentRoom', 'room')
      .leftJoin('room.unit', 'unit')
      .select('unit.id', 'unitId')
      .addSelect('unit.name', 'unitName')
      .addSelect('unit.unitCode', 'unitCode')
      .addSelect('COUNT(*)', 'totalAssets')
      .addSelect('SUM(CASE WHEN asset.type = :fixedType THEN 1 ELSE 0 END)', 'fixedAssets')
      .addSelect('SUM(CASE WHEN asset.type = :toolsType THEN 1 ELSE 0 END)', 'toolsEquipment')
      .addSelect('SUM(CASE WHEN asset.status = :inUseStatus THEN 1 ELSE 0 END)', 'inUseAssets')
      .addSelect('SUM(CASE WHEN asset.status = :damagedStatus THEN 1 ELSE 0 END)', 'damagedAssets')
      .where('unit.id IS NOT NULL')
      .setParameters({
        fixedType: AssetType.FIXED_ASSET,
        toolsType: AssetType.TOOLS_EQUIPMENT,
        inUseStatus: AssetStatus.IN_USE,
        damagedStatus: AssetStatus.DAMAGED,
      });

    // Apply permission filters
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        query.andWhere('unit.id IN (:...unitIds)', { unitIds });
      } else {
        return [];
      }
    }

    const unitStatsRaw = await query
      .groupBy('unit.id')
      .addGroupBy('unit.name')
      .addGroupBy('unit.unitCode')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return unitStatsRaw.map(item => ({
      unitId: item.unitId,
      unitName: item.unitName,
      unitCode: parseInt(item.unitCode),
      totalAssets: parseInt(item.totalAssets),
      fixedAssets: parseInt(item.fixedAssets || 0),
      toolsEquipment: parseInt(item.toolsEquipment || 0),
      inUseAssets: parseInt(item.inUseAssets || 0),
      damagedAssets: parseInt(item.damagedAssets || 0),
    }));
  }

  private async getRecentActivities(currentUser: User): Promise<RecentActivityDto[]> {
    const activities: RecentActivityDto[] = [];

    // Get recent asset creation/updates
    const assetQuery = this.assetRepository.createQueryBuilder('asset');
    
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        assetQuery
          .leftJoin('asset.currentRoom', 'room')
          .leftJoin('room.unit', 'unit')
          .where('unit.id IN (:...unitIds)', { unitIds });
      }
    }

    const recentAssets = await assetQuery
      .leftJoinAndSelect('asset.creator', 'creator')
      .orderBy('asset.createdAt', 'DESC')
      .limit(5)
      .getMany();

    recentAssets.forEach(asset => {
      activities.push({
        id: asset.id,
        type: 'create',
        title: 'Thêm mới tài sản',
        description: `Định danh tài sản: ${asset.name}`,
        userName: asset.creator?.fullName || 'Hệ thống',
        userId: asset.createdBy,
        createdAt: asset.createdAt,
      });
    });

    // Get recent transactions
    const transactionQuery = this.transactionRepository.createQueryBuilder('transaction');
    
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        transactionQuery.where(
          '(transaction.fromUnitId IN (:...unitIds) OR transaction.toUnitId IN (:...unitIds))',
          { unitIds }
        );
      }
    }

    const recentTransactions = await transactionQuery
      .leftJoinAndSelect('transaction.requester', 'requester')
      .leftJoinAndSelect('transaction.fromUnit', 'fromUnit')
      .leftJoinAndSelect('transaction.toUnit', 'toUnit')
      .orderBy('transaction.createdAt', 'DESC')
      .limit(5)
      .getMany();

    recentTransactions.forEach(transaction => {
      activities.push({
        id: transaction.id,
        type: 'transaction',
        title: 'Bàn giao tài sản',
        description: `Bàn giao từ ${transaction.fromUnit?.name || 'N/A'} đến ${transaction.toUnit?.name || 'N/A'}`,
        userName: transaction.requester?.fullName || 'Hệ thống',
        userId: transaction.requesterId,
        createdAt: transaction.createdAt,
      });
    });

    // Get recent movements
    const movementQuery = this.movementRepository.createQueryBuilder('movement');
    
    if (!this.permissionHelper.isAdmin(currentUser)) {
      const unitIds = await this.permissionHelper.getAccessibleUnitIds(currentUser);
      if (unitIds.length > 0) {
        movementQuery
          .leftJoin('movement.items', 'movementItems')
          .leftJoin('movementItems.fromRoom', 'fromRoom')
          .leftJoin('fromRoom.unit', 'fromUnit')
          .leftJoin('movementItems.toRoom', 'toRoom')
          .leftJoin('toRoom.unit', 'toUnit')
          .where(
            '(fromUnit.id IN (:...unitIds) OR toUnit.id IN (:...unitIds))',
            { unitIds }
          );
      }
    }

    const recentMovements = await movementQuery
      .leftJoinAndSelect('movement.requester', 'requester')
      .leftJoinAndSelect('movement.items', 'items')
      .leftJoinAndSelect('items.fromRoom', 'fromRoomData')
      .leftJoinAndSelect('items.toRoom', 'toRoomData')
      .orderBy('movement.createdAt', 'DESC')
      .limit(5)
      .getMany();

    recentMovements.forEach(movement => {
      // Get first item's rooms for summary
      const firstItem = movement.items?.[0];
      const fromRoomName = firstItem?.fromRoom?.name || 'N/A';
      const toRoomName = firstItem?.toRoom?.name || 'N/A';
      
      activities.push({
        id: movement.id,
        type: 'movement',
        title: 'Di chuyển tài sản',
        description: `Di chuyển từ ${fromRoomName} đến ${toRoomName}`,
        userName: movement.requester?.fullName || 'Hệ thống',
        userId: movement.requesterId,
        createdAt: movement.createdAt,
      });
    });

    // Sort all activities by date and return top 20
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return activities.slice(0, 20);
  }

  private getEmptyStats(): DashboardStatsDto {
    return {
      totalAssets: 0,
      fixedAssets: 0,
      toolsEquipment: 0,
      inUseAssets: 0,
      damagedAssets: 0,
      lostAssets: 0,
      proposedLiquidationAssets: 0,
      liquidatedAssets: 0,
      unidentifiedAssets: 0,
      pendingTransactions: 0,
      approvedTransactions: 0,
      completedTransactions: 0,
      pendingMovements: 0,
      completedMovements: 0,
      assetsByStatus: [],
      assetsByCategory: [],
      assetsByType: [],
      topLocations: [],
      unitStatistics: [],
      recentActivities: [],
    };
  }
}

