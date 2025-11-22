import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Unit } from 'src/entities/unit.entity';
import { AccessScope, AccessScopeType } from 'src/entities/access-scope.entity';

@Injectable()
export class AccessScopeService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(AccessScope)
    private readonly accessScopeRepository: Repository<AccessScope>,
  ) {}

  /**
   * Lấy danh sách unitIds mà user có quyền truy cập
   */
  async getAccessibleUnitIds(user: User): Promise<string[]> {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }
    console.log('Getting accessible unit IDs for user:', user.unitId);
    const allAccessibleUnitIds = new Set<string>();

    // Duyệt qua tất cả roles của user
    for (const role of user.roles) {
      if (!role.accessScope) continue;

      const unitIds = await this.getUnitIdsByAccessScope(
        role.accessScope, 
        user.unitId, 
        user.id
      );
      unitIds.forEach(id => allAccessibleUnitIds.add(id));
    }

    return Array.from(allAccessibleUnitIds);
  }

  /**
   * Lấy unitIds dựa trên AccessScope
   */
  private async getUnitIdsByAccessScope(
    accessScope: AccessScope, 
    userUnitId?: string, 
    userId?: string
  ): Promise<string[]> {
    switch (accessScope.type) {
      case AccessScopeType.GLOBAL:
        return this.getAllUnitIds();

      case AccessScopeType.UNIT:
        // Lấy unit của user thay vì từ accessScope
        return userUnitId ? [userUnitId] : [];

      case AccessScopeType.CHILD_UNITS:
        // Chỉ lấy children của unit mà user đang thuộc về (không bao gồm chính unit đó)
        return userUnitId ? 
          this.getChildUnitIds(userUnitId) : [];

      case AccessScopeType.SELF:
        // Trả về unit của user (nếu có)
        return userUnitId ? [userUnitId] : [];

      default:
        return [];
    }
  }

  /**
   * Lấy tất cả unit IDs trong hệ thống
   */
  private async getAllUnitIds(): Promise<string[]> {
    const units = await this.unitRepository.find({ select: ['id'] });
    return units.map(unit => unit.id);
  }

  /**
   * Lấy unit và tất cả unit con
   */
  private async getUnitAndChildrenIds(unitId: string): Promise<string[]> {
    const result = new Set<string>();
    result.add(unitId);

    const children = await this.getChildUnitIds(unitId);
    children.forEach(id => result.add(id));

    return Array.from(result);
  }

  /**
   * Đệ quy lấy tất cả unit con
   */
  private async getChildUnitIds(parentUnitId: string): Promise<string[]> {
    const children = await this.unitRepository.find({
      where: { parentUnitId },
      select: ['id']
    });

    const result: string[] = [];
    
    for (const child of children) {
      result.push(child.id);
      // Đệ quy lấy unit con của unit con
      const grandChildren = await this.getChildUnitIds(child.id);
      result.push(...grandChildren);
    }

    return result;
  }

  /**
   * Tạo filter condition cho việc filter dữ liệu
   */
  async createUnitAccessFilter(user: User, fieldName: string = "unitId") {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      return {
        field: fieldName,
        fieldType: "select",
        operator: "equals",
        value: ["00000000-0000-0000-0000-000000000000"], // UUID null
      };
    }

    if (accessibleUnitIds.length === 1) {
      return {
        field: fieldName,
        fieldType: "select",
        operator: "equals",
        value: accessibleUnitIds,
      };
    }

    return {
      field: fieldName,
      fieldType: "select",
      operator: "in",
      value: accessibleUnitIds,
    };
  }

  /**
   * Tạo TypeORM WHERE condition
   */
  async createTypeORMWhereCondition(user: User, fieldName: string = "unitId") {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      return { [fieldName]: "00000000-0000-0000-0000-000000000000" };
    }

    if (accessibleUnitIds.length === 1) {
      return { [fieldName]: accessibleUnitIds[0] };
    }

    return { [fieldName]: accessibleUnitIds };
  }

  /**
   * Áp dụng unit access filter vào QueryBuilder
   */
  async applyUnitAccessFilter(
    queryBuilder: any, 
    user: User, 
    fieldName: string = "unitId",
    alias?: string
  ) {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      // Không có quyền xem gì
      queryBuilder.andWhere("1 = 0");
      return;
    }

    const fullFieldName = alias ? `${alias}.${fieldName}` : fieldName;
    
    if (accessibleUnitIds.length === 1) {
      queryBuilder.andWhere(`${fullFieldName} = :unitId`, { 
        unitId: accessibleUnitIds[0] 
      });
    } else {
      queryBuilder.andWhere(`${fullFieldName} IN (:...unitIds)`, { 
        unitIds: accessibleUnitIds 
      });
    }
  }

  /**
   * Kiểm tra user có quyền truy cập unit cụ thể không
   */
  async canAccessUnit(user: User, unitId: string): Promise<boolean> {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    return accessibleUnitIds.includes(unitId);
  }

  /**
   * Lấy các campus mà user có quyền truy cập
   */
  async getAccessibleCampuses(user: User): Promise<Unit[]> {
    const accessibleUnitIds = await this.getAccessibleUnitIds(user);
    
    if (accessibleUnitIds.length === 0) {
      return [];
    }

    // Lấy các campus từ danh sách accessible units
    const campuses = await this.unitRepository
      .createQueryBuilder('unit')
      .where('unit.id IN (:...unitIds)', { unitIds: accessibleUnitIds })
      .andWhere('unit.type = :type', { type: 'CAMPUS' })
      .getMany();

    return campuses;
  }
}
