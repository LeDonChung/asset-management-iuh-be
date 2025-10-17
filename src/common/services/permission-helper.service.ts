import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Unit } from 'src/entities/unit.entity';
import { UnitType } from 'src/common/shared/UnitType';
import { RoleBase } from '../utils/role.enum';

@Injectable()
export class PermissionHelperService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  /**
   * Kiểm tra xem user có phải là quản trị không (role có quyền quản trị hoặc thuộc phòng quản trị)
   */
  isAdminUser(user: User): boolean {
    const adminRoleCodes = ['ADMIN'];
    
    if (user.roles && user.roles.length > 0) {
      const hasAdminRole = user.roles.some(role => 
        adminRoleCodes.includes(role.code)
      );
      if (hasAdminRole) {
        return true;
      }
    }

    // Kiểm tra xem có thuộc phòng quản trị không
    if (user.unit && user.unit.type === UnitType.ADMIN_DEPT) {
      return true;
    }

    return false;
  }

  isAdminDeptUser(user: User): boolean {
    return user.roles?.some(role => role.code === RoleBase.ADMIN_DEPT);
  }

  /**
   * Lấy danh sách unitIds mà user có quyền xem
   */
  async getAccessibleUnitIds(user: User): Promise<string[]> {
    if (!user.unitId) {
      return [];
    }

    // Load user unit với relations
    const userUnit = await this.unitRepository.findOne({
      where: { id: user.unitId },
      relations: ['parentUnit', 'childUnits']
    });

    if (!userUnit) {
      return [];
    }

    // Nếu là admin user, có thể xem tất cả units trong campus
    if (this.isAdminUser(user)) {
      return this.getCampusUnitIds(userUnit);
    }

    // Nếu không phải admin, chỉ xem được unit của mình
    return [user.unitId];
  }

  /**
   * Lấy tất cả unit IDs trong campus
   */
  private async getCampusUnitIds(currentUnit: Unit): Promise<string[]> {
    let campusUnit: Unit;

    // Tìm campus root
    if (currentUnit.type === UnitType.CAMPUS) {
      campusUnit = currentUnit;
    } else {
      // Tìm parent campus
      const unitWithParent = await this.unitRepository.findOne({
        where: { id: currentUnit.id },
        relations: ['parentUnit']
      });

      if (unitWithParent?.parentUnit?.type === UnitType.CAMPUS) {
        campusUnit = unitWithParent.parentUnit;
      } else {
        // Nếu không tìm thấy campus, chỉ trả về unit hiện tại
        return [currentUnit.id];
      }
    }

    // Lấy tất cả child units của campus
    const allUnitsInCampus = await this.unitRepository.find({
      where: [
        { id: campusUnit.id }, // Campus chính
        { parentUnitId: campusUnit.id } // Tất cả units con
      ]
    });

    return allUnitsInCampus.map(unit => unit.id);
  }

  /**
   * Tạo filter condition cho unitId dựa trên quyền của user
   */
  async createUnitAccessFilter(user: User) {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      // Nếu không có quyền xem unit nào, trả về condition không thể match
      // Sử dụng UUID null để tránh lỗi invalid UUID syntax
      return {
        field: "unitId",
        fieldType: "select",
        operator: "equals",
        value: ["00000000-0000-0000-0000-000000000000"], // UUID null không thể match
      };
    }

    if (accessibleUnitIds.length === 1) {
      // Nếu chỉ có quyền xem 1 unit
      return {
        field: "unitId",
        fieldType: "select",
        operator: "equals",
        value: accessibleUnitIds,
      };
    }

    // Nếu có quyền xem nhiều units
    return {
      field: "unitId",
      fieldType: "select",
      operator: "in",
      value: accessibleUnitIds,
    };
  }
}
