import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Unit } from 'src/entities/unit.entity';
import { UnitType } from 'src/common/shared/UnitType';
import { RoleBase } from '../utils/role.enum';
import { AccessScopeService } from './access-scope.service';
import { AccessScopeType } from 'src/entities/access-scope.entity';

@Injectable()
export class PermissionHelperService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  /**
   * Kiểm tra xem user có phải là quản trị không (role có quyền quản trị hoặc thuộc phòng quản trị)
   */
  isAdminUser(user: User): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }

    // Kiểm tra có role ADMIN hoặc ADMIN_DEPT
    return user.roles.some(role => 
      role.code === RoleBase.ADMIN || role.code === RoleBase.ADMIN_DEPT
    );
  }

  isAdminDeptUser(user: User): boolean {
    return user.roles?.some(role => role.code === RoleBase.ADMIN_DEPT) ?? false;
  }

  isUserDeptUser(user: User): boolean {
    return user.roles?.some(role => role.code === RoleBase.USER_DEPT) ?? false;
  }

  isAdmin(user: User): boolean {
    return user.roles?.some(role => role.code === RoleBase.ADMIN) ?? false;
  }

  /**
   * Lấy danh sách unitIds mà user có quyền xem
   * Ưu tiên sử dụng AccessScope nếu có, fallback về role-based logic
   */
  async getAccessibleUnitIds(user: User): Promise<string[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    // Kiểm tra xem có role nào có AccessScope không
    const hasAccessScope = user.roles.some(role => role.accessScope);
    if (hasAccessScope) {
      // Sử dụng AccessScopeService nếu có AccessScope
      return this.accessScopeService.getAccessibleUnitIds(user);
    }

    // Fallback về logic cũ dựa trên role codes
    return this.getLegacyAccessibleUnitIds(user);
  }

  /**
   * Logic cũ dựa trên role codes (để backward compatibility)
   */
  private async getLegacyAccessibleUnitIds(user: User): Promise<string[]> {
    if (!user.unitId) {
      return [];
    }

    // Load user unit với relations
    const userUnit = await this.unitRepository.findOne({
      where: { id: user.unitId },
      relations: ['parentUnit']
    });

    if (!userUnit) {
      return [];
    }

    // ADMIN: có thể xem tất cả units trong hệ thống
    if (this.isAdmin(user)) {
      const allUnits = await this.unitRepository.find({
        select: ['id']
      });
      return allUnits.map(unit => unit.id);
    }

    // ADMIN_DEPT: có thể xem tất cả units trong campus
    if (this.isAdminDeptUser(user)) {
      return this.getCampusUnitIds(userUnit);
    }

    // USER_DEPT và các role khác: chỉ xem được unit của mình
    return [user.unitId];
  }

  /**
   * Lấy tất cả unit IDs trong campus bao gồm cả campus chính
   */
  private async getCampusUnitIds(currentUnit: Unit): Promise<string[]> {
    let campusUnit: Unit;

    // Tìm campus root bằng cách đệ quy lên parent
    if (currentUnit.type === UnitType.CAMPUS) {
      campusUnit = currentUnit;
    } else {
      // Tìm campus root bằng cách traverse lên parent
      campusUnit = await this.findCampusRoot(currentUnit);
      if (!campusUnit) {
        // Nếu không tìm thấy campus, chỉ trả về unit hiện tại
        return [currentUnit.id];
      }
    }

    // Lấy tất cả units trong campus bao gồm cả campus chính
    const allUnitsInCampus = await this.unitRepository.find({
      where: [
        { id: campusUnit.id }, // Campus chính
        { parentUnitId: campusUnit.id } // Tất cả units con trực tiếp
      ],
      select: ['id']
    });

    return allUnitsInCampus.map(unit => unit.id);
  }

  /**
   * Tìm campus root bằng cách đệ quy lên parent
   */
  private async findCampusRoot(unit: Unit): Promise<Unit | null> {
    let currentUnit = unit;
    
    // Đệ quy lên parent cho đến khi tìm thấy CAMPUS hoặc hết parent
    while (currentUnit && currentUnit.type !== UnitType.CAMPUS) {
      if (!currentUnit.parentUnitId) {
        break;
      }
      
      const parent = await this.unitRepository.findOne({
        where: { id: currentUnit.parentUnitId },
        relations: ['parentUnit']
      });
      
      if (!parent) {
        break;
      }
      
      currentUnit = parent;
    }

    return currentUnit?.type === UnitType.CAMPUS ? currentUnit : null;
  }

  /**
   * Tạo filter condition cho unitId dựa trên quyền của user
   */
  async createUnitAccessFilter(user: User, fieldName: string = "unitId") {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      // Nếu không có quyền xem unit nào, trả về condition không thể match
      // Sử dụng UUID null để tránh lỗi invalid UUID syntax
      return {
        field: fieldName,
        fieldType: "select",
        operator: "equals",
        value: ["00000000-0000-0000-0000-000000000000"], // UUID null không thể match
      };
    }

    if (accessibleUnitIds.length === 1) {
      // Nếu chỉ có quyền xem 1 unit
      return {
        field: fieldName,
        fieldType: "select",
        operator: "equals",
        value: accessibleUnitIds,
      };
    }

    // Nếu có quyền xem nhiều units
    return {
      field: fieldName,
      fieldType: "select",
      operator: "in",
      value: accessibleUnitIds,
    };
  }

  /**
   * Kiểm tra xem user có quyền truy cập vào unit cụ thể không
   */
  async canAccessUnit(user: User, unitId: string): Promise<boolean> {
    if (!unitId) {
      return false;
    }

    // Kiểm tra xem có role nào có AccessScope không
    const hasAccessScope = user.roles?.some(role => role.accessScope);
    
    if (hasAccessScope) {
      // Sử dụng AccessScopeService nếu có AccessScope
      return this.accessScopeService.canAccessUnit(user, unitId);
    }

    // Fallback về logic cũ
    if (!user.unitId) {
      return false;
    }

    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    return accessibleUnitIds.includes(unitId);
  }

  /**
   * Kiểm tra xem user có quyền tạo/sửa/xóa trong unit cụ thể không
   * Chỉ admin và admin_dept mới có quyền modify
   */
  async canModifyInUnit(user: User, unitId: string): Promise<boolean> {
    if (!this.isAdminUser(user)) {
      return false;
    }

    return this.canAccessUnit(user, unitId);
  }

  /**
   * Lấy role cao nhất của user (để xác định priority)
   */
  getHighestRole(user: User): string | null {
    if (!user.roles || user.roles.length === 0) {
      return null;
    }

    const rolePriority = {
      [RoleBase.ADMIN]: 1,
      [RoleBase.ADMIN_DEPT]: 2,
      [RoleBase.INVENTORY_COMMITTEE_HEAD]: 3,
      [RoleBase.INVENTORY_COMMITTEE_SECRETARY]: 4,
      [RoleBase.INVENTORY_COMMITTEE_MEMBER]: 5,
      [RoleBase.USER_DEPT]: 6,
    };

    const userRoles = user.roles.map(role => role.code);
    let highestRole = null;
    let highestPriority = Number.MAX_SAFE_INTEGER;

    for (const roleCode of userRoles) {
      const priority = rolePriority[roleCode] || Number.MAX_SAFE_INTEGER;
      if (priority < highestPriority) {
        highestPriority = priority;
        highestRole = roleCode;
      }
    }

    return highestRole;
  }

  /**
   * Lấy access scope type cao nhất của user
   */
  getHighestAccessScopeType(user: User): AccessScopeType | null {
    if (!user.roles || user.roles.length === 0) {
      return null;
    }

    const accessScopePriority = {
      [AccessScopeType.GLOBAL]: 1,
      [AccessScopeType.CHILD_UNITS]: 2,
      [AccessScopeType.UNIT]: 3,
      [AccessScopeType.SELF]: 4,
    };

    let highestAccessType: AccessScopeType | null = null;
    let highestPriority = Number.MAX_SAFE_INTEGER;

    for (const role of user.roles) {
      if (role.accessScope) {
        const priority = accessScopePriority[role.accessScope.type] || Number.MAX_SAFE_INTEGER;
        if (priority < highestPriority) {
          highestPriority = priority;
          highestAccessType = role.accessScope.type;
        }
      }
    }

    return highestAccessType;
  }

  /**
   * Kiểm tra user có phải global admin không (dựa trên AccessScope)
   */
  isGlobalAdmin(user: User): boolean {
    if (!user.roles) return false;
    
    return user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.GLOBAL
    );
  }

  /**
   * Kiểm tra user có quyền quản lý child units không (dựa trên AccessScope)
   */
  canManageChildUnits(user: User): boolean {
    if (!user.roles) return false;
    
    return user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.CHILD_UNITS ||
      role.accessScope?.type === AccessScopeType.GLOBAL
    );
  }

  /**
   * Kiểm tra user có phải unit level user không (dựa trên AccessScope)
   */
  isUnitLevelUser(user: User): boolean {
    if (!user.roles) return false;
    
    const hasHigherAccess = user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.GLOBAL ||
      role.accessScope?.type === AccessScopeType.CHILD_UNITS
    );

    return !hasHigherAccess && user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.UNIT
    );
  }

  /**
   * Unified method để kiểm tra admin user (kết hợp cả role-based và access-scope-based)
   */
  isAdminUserUnified(user: User): boolean {
    // Kiểm tra theo AccessScope trước
    if (this.isGlobalAdmin(user) || this.canManageChildUnits(user)) {
      return true;
    }

    // Fallback về role-based check
    return this.isAdminUser(user);
  }

  /**
   * Lấy thông tin tổng hợp về quyền của user
   */
  async getUserPermissionSummary(user: User): Promise<{
    hasAccessScope: boolean;
    highestRole: string | null;
    highestAccessType: AccessScopeType | null;
    isGlobalAdmin: boolean;
    canManageChildUnits: boolean;
    isUnitLevelUser: boolean;
    accessibleUnitCount: number;
  }> {
    const hasAccessScope = user.roles?.some(role => role.accessScope) ?? false;
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);

    return {
      hasAccessScope,
      highestRole: this.getHighestRole(user),
      highestAccessType: this.getHighestAccessScopeType(user),
      isGlobalAdmin: this.isGlobalAdmin(user),
      canManageChildUnits: this.canManageChildUnits(user),
      isUnitLevelUser: this.isUnitLevelUser(user),
      accessibleUnitCount: accessibleUnitIds.length,
    };
  }
}
