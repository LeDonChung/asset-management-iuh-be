import { Injectable } from '@nestjs/common';
import { AccessScopeService } from './access-scope.service';
import { User } from 'src/entities/user.entity';
import { AccessScopeType } from 'src/entities/access-scope.entity';
import { AccessScopeInfoDto, EffectiveAccessScopeDto } from '../dto/access-scope.dto';

@Injectable()
export class UserAccessInfoService {
  constructor(
    private readonly accessScopeService: AccessScopeService,
  ) {}

  /**
   * Tính toán thông tin access scope hiệu quả của user
   */
  async calculateEffectiveAccessScope(user: User): Promise<EffectiveAccessScopeDto> {
    if (!user.roles || user.roles.length === 0) {
      return {
        canAccessGlobal: false,
        canAccessChildUnits: false,
        canAccessOwnUnit: false,
        canAccessSelfOnly: true,
        accessibleUnitIds: [],
        primaryAccessType: AccessScopeType.SELF
      };
    }

    const accessScopes = user.roles
      .map(role => role.accessScope)
      .filter(scope => scope !== null && scope !== undefined);

    // Xác định các quyền truy cập
    const canAccessGlobal = accessScopes.some(scope => scope.type === AccessScopeType.GLOBAL);
    const canAccessChildUnits = accessScopes.some(scope => scope.type === AccessScopeType.CHILD_UNITS);
    const canAccessOwnUnit = accessScopes.some(scope => scope.type === AccessScopeType.UNIT);
    const canAccessSelfOnly = accessScopes.some(scope => scope.type === AccessScopeType.SELF);

    // Lấy danh sách unit IDs có thể truy cập
    const accessibleUnitIds = await this.accessScopeService.getAccessibleUnitIds(user);

    // Xác định primary access type (ưu tiên từ cao xuống thấp)
    let primaryAccessType: AccessScopeType;
    if (canAccessGlobal) {
      primaryAccessType = AccessScopeType.GLOBAL;
    } else if (canAccessChildUnits) {
      primaryAccessType = AccessScopeType.CHILD_UNITS;
    } else if (canAccessOwnUnit) {
      primaryAccessType = AccessScopeType.UNIT;
    } else {
      primaryAccessType = AccessScopeType.SELF;
    }

    return {
      canAccessGlobal,
      canAccessChildUnits,
      canAccessOwnUnit,
      canAccessSelfOnly,
      accessibleUnitIds,
      primaryAccessType
    };
  }

  /**
   * Lấy thông tin chi tiết các access scope của user
   */
  async getUserAccessScopeInfo(user: User): Promise<AccessScopeInfoDto[]> {
    if (!user.roles) return [];

    return user.roles
      .map(role => role.accessScope)
      .filter(scope => scope !== null && scope !== undefined)
      .map(scope => ({
        type: scope.type,
        unitId: scope.unitId,
        unit: scope.unit,
        description: scope.description
      }));
  }

  /**
   * Kiểm tra user có phải admin toàn hệ thống không
   */
  isGlobalAdmin(user: User): boolean {
    if (!user.roles) return false;
    
    return user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.GLOBAL
    );
  }

  /**
   * Kiểm tra user có quyền quản lý child units không
   */
  canManageChildUnits(user: User): boolean {
    if (!user.roles) return false;
    
    return user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.CHILD_UNITS ||
      role.accessScope?.type === AccessScopeType.GLOBAL
    );
  }

  /**
   * Kiểm tra user chỉ có quyền truy cập unit của mình
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
   * Kiểm tra user chỉ có quyền xem dữ liệu của mình
   */
  isSelfOnlyUser(user: User): boolean {
    if (!user.roles) return true;
    
    const hasAnyUnitAccess = user.roles.some(role => 
      role.accessScope?.type === AccessScopeType.GLOBAL ||
      role.accessScope?.type === AccessScopeType.CHILD_UNITS ||
      role.accessScope?.type === AccessScopeType.UNIT
    );

    return !hasAnyUnitAccess;
  }
}
