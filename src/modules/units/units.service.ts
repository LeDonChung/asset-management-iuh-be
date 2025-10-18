import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { UnitResponseDto } from "./dto/unit-response.dto";
import { Unit } from "src/entities/unit.entity";
import { User } from "src/entities/user.entity";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { UnitType } from "src/common/shared/UnitType";
import { plainToInstance } from "class-transformer";
import { UnitFilterDto } from "./dto/unit-filter.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { FieldType } from "src/common/dto/filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";
import { PermissionHelperService } from "src/common/services/permission-helper.service";

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private permissionHelper: PermissionHelperService
  ) {}

  async generateUnitCode(): Promise<number> {
    const count = await this.unitRepository.count();
    return count + 1;
  }

  private async getAllChildUnitIds(campusId: string): Promise<string[]> {
    try {
      // Lấy campus và tất cả children của nó
      const campus = await this.unitRepository.findOne({
        where: { id: campusId },
        relations: ["childUnits"],
      });

      if (!campus) {
        return [campusId]; // Fallback: chỉ trả về campus ID
      }

      // Trả về campus ID và tất cả child unit IDs
      const allIds = [campusId];
      if (campus.childUnits && campus.childUnits.length > 0) {
        allIds.push(...campus.childUnits.map(child => child.id));
      }

      return allIds;
    } catch (error) {
      console.error("Error getting child unit IDs:", error);
      return [campusId]; // Fallback: chỉ trả về campus ID
    }
  }
  async create(
    createUnitDto: CreateUnitDto,
    currentUser?: User
  ): Promise<UnitResponseDto> {
    try {
      let representative: User | undefined;

      // Validate representative if provided
      if (createUnitDto.representativeId) {
        representative = await this.userRepository.findOne({
          where: { id: createUnitDto.representativeId },
        });
        if (!representative) {
          throw new BadRequestException({
            code: "USER_NOT_FOUND",
            message: "Representative user not found",
          });
        }
      }

      // Validate parent unit if provided
      if (createUnitDto.parentUnitId) {
        const parentUnit = await this.unitRepository.findOne({
          where: { id: createUnitDto.parentUnitId },
        });
        if (!parentUnit) {
          throw new BadRequestException({
            code: "PARENT_UNIT_NOT_FOUND",
            message: "Parent unit not found",
          });
        }

        // Validate hierarchy rules
        await this.validateUnitHierarchy(createUnitDto.type, parentUnit.type);
      } else {
        // Only CAMPUS can be root level
        if (createUnitDto.type !== UnitType.CAMPUS) {
          throw new BadRequestException({
            code: "INVALID_ROOT_UNIT",
            message: "Only CAMPUS units can be root level",
          });
        }
      }

      // Generate unit code (count + 1)
      const unitCode = await this.generateUnitCode();

      // Check if unit code already exists (just in case)
      const existingUnit = await this.unitRepository.findOne({
        where: { unitCode },
      });
      if (existingUnit) {
        throw new ConflictException({
          code: "UNIT_CODE_EXISTS",
          message: "Unit code already exists",
        });
      }

      const unit = this.unitRepository.create({
        ...createUnitDto,
        unitCode,
        createdBy: currentUser,
        status: createUnitDto.status || UnitStatus.ACTIVE,
      });

      const savedUnit = await this.unitRepository.save(unit);

      // Update representative's unitId if representative is provided
      if (representative) {
        representative.unitId = savedUnit.id;
        await this.userRepository.save(representative);
      }

      return this.findOne(savedUnit.id);
    } catch (error) {
      console.error("Error creating unit:", error);
      throw error;
    }
  }

  private async validateUnitHierarchy(
    childType: UnitType,
    parentType: UnitType
  ): Promise<void> {
    // CAMPUS can have ADMIN_DEPT or USER_DEPT as children
    if (parentType === UnitType.CAMPUS) {
      if (
        childType !== UnitType.ADMIN_DEPT &&
        childType !== UnitType.USER_DEPT
      ) {
        throw new BadRequestException({
          code: "INVALID_HIERARCHY",
          message: "CAMPUS can only have ADMIN_DEPT or USER_DEPT as children",
        });
      }
    }
    // ADMIN_DEPT and USER_DEPT cannot have children
    else if (
      parentType === UnitType.ADMIN_DEPT ||
      parentType === UnitType.USER_DEPT
    ) {
      throw new BadRequestException({
        code: "INVALID_HIERARCHY",
        message: "ADMIN_DEPT and USER_DEPT cannot have children",
      });
    }
  }

  async findAll(currentUser?: User): Promise<UnitResponseDto[]> {
    let queryBuilder = this.unitRepository.createQueryBuilder("unit")
      .leftJoinAndSelect("unit.representative", "representative")
      .leftJoinAndSelect("unit.parentUnit", "parentUnit")
      .leftJoinAndSelect("unit.childUnits", "childUnits")
      .leftJoinAndSelect("unit.rooms", "rooms")
      .orderBy("unit.createdAt", "DESC");

    // Áp dụng rule phân quyền nếu có currentUser
    if (currentUser) {
      if (this.permissionHelper.isAdmin(currentUser)) {
        // Admin: Có thể xem tất cả units - không cần thêm điều kiện
      } else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        // AdminDept: unitId chính là campus ID, xem được tất cả units thuộc cơ sở này
        if (currentUser.unitId) {
          // Lấy tất cả unit IDs thuộc campus này (bao gồm campus và children)
          const allUnitIds = await this.getAllChildUnitIds(currentUser.unitId);
          if (allUnitIds.length > 0) {
            queryBuilder = queryBuilder.andWhere("unit.id IN (:...unitIds)", { unitIds: allUnitIds });
          } else {
            // Fallback: chỉ xem campus của mình
            queryBuilder = queryBuilder.andWhere("unit.id = :unitId", { unitId: currentUser.unitId });
          }
        } else {
          // Nếu không có unitId, trả về empty
          queryBuilder = queryBuilder.andWhere("1 = 0");
        }
      } else if (this.permissionHelper.isUserDeptUser(currentUser)) {
        // UserDept: Chỉ xem được unit của mình
        if (currentUser.unitId) {
          queryBuilder = queryBuilder.andWhere("unit.id = :unitId", { unitId: currentUser.unitId });
        } else {
          // Nếu không có unitId, trả về empty
          queryBuilder = queryBuilder.andWhere("1 = 0");
        }
      } else {
        // Người dùng không có role phù hợp - không được xem gì
        queryBuilder = queryBuilder.andWhere("1 = 0");
      }
    }

    const units = await queryBuilder.getMany();
    return plainToInstance(UnitResponseDto, units, {
      excludeExtraneousValues: true,
    });
  }

  async findRootUnits(): Promise<UnitResponseDto[]> {
    const units = await this.unitRepository.find({
      where: { parentUnitId: null },
      relations: [
        "representative",
        "childUnits",
        "childUnits.childUnits",
        "rooms",
      ],
      order: { createdAt: "DESC" },
    });
    return plainToInstance(UnitResponseDto, units, {
      excludeExtraneousValues: true,
    });
  }

  async findByType(type: UnitType): Promise<UnitResponseDto[]> {
    try {
      const units = await this.unitRepository.find({
        where: { type },
        relations: ["childUnits"],
        order: { createdAt: "DESC" },
      });
      return plainToInstance(UnitResponseDto, units, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error("Error fetching units by type:", error);
      throw error;
    }
  }

  async findChildren(parentId: string): Promise<UnitResponseDto[]> {
    try {
      // First check if parent unit exists
      const parentUnit = await this.unitRepository.findOne({
        where: { id: parentId },
      });

      if (!parentUnit) {
        throw new NotFoundException({
          code: "PARENT_UNIT_NOT_FOUND",
          message: "Parent unit not found",
        });
      }

      // Find all child units
      const childUnits = await this.unitRepository.find({
        where: { parentUnitId: parentId },
        relations: ["representative", "rooms"],
        order: { createdAt: "DESC" },
      });

      return plainToInstance(UnitResponseDto, childUnits, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error("Error fetching child units:", error);
      throw error;
    }
  }

  async findOne(id: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { id },
      relations: ["representative", "rooms"],
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateUnitDto: UpdateUnitDto
  ): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { id },
      relations: ["parentUnit", "representative"],
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    let newRepresentative: User | undefined;
    const oldRepresentative = unit.representative;

    // Validate representative if provided
    if (updateUnitDto.representativeId) {
      newRepresentative = await this.userRepository.findOne({
        where: { id: updateUnitDto.representativeId },
      });
      if (!newRepresentative) {
        throw new BadRequestException({
          code: "USER_NOT_FOUND",
          message: "Representative user not found",
        });
      }
    }

    // Validate parent unit change if provided
    if (updateUnitDto.parentUnitId !== undefined) {
      if (updateUnitDto.parentUnitId) {
        const parentUnit = await this.unitRepository.findOne({
          where: { id: updateUnitDto.parentUnitId },
        });
        if (!parentUnit) {
          throw new BadRequestException({
            code: "PARENT_UNIT_NOT_FOUND",
            message: "Parent unit not found",
          });
        }

        // Prevent circular reference
        if (parentUnit.id === id) {
          throw new BadRequestException({
            code: "CIRCULAR_REFERENCE",
            message: "Unit cannot be parent of itself",
          });
        }

        // Validate hierarchy if type is also being updated
        const newType = updateUnitDto.type || unit.type;
        await this.validateUnitHierarchy(newType, parentUnit.type);
      } else {
        // Setting parent to null - only CAMPUS can be root
        const newType = updateUnitDto.type || unit.type;
        if (newType !== UnitType.CAMPUS) {
          throw new BadRequestException({
            code: "INVALID_ROOT_UNIT",
            message: "Only CAMPUS units can be root level",
          });
        }
      }
    }

    Object.assign(unit, updateUnitDto);
    const updatedUnit = await this.unitRepository.save(unit);

    // Handle representative changes
    if (updateUnitDto.representativeId !== undefined) {
      // Remove old representative's unit association
      if (oldRepresentative && oldRepresentative.id !== updateUnitDto.representativeId) {
        oldRepresentative.unitId = null;
        await this.userRepository.save(oldRepresentative);
      }

      // Set new representative's unit association
      if (newRepresentative) {
        newRepresentative.unitId = updatedUnit.id;
        await this.userRepository.save(newRepresentative);
      }
    }

    return this.findOne(updatedUnit.id);
  }

  async remove(id: string): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException({
        code: "UNIT_NOT_FOUND",
        message: "Unit not found",
      });
    }

    await this.unitRepository.softDelete(id);
  }

  async findByUnitCode(unitCode: number): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findOne({
      where: { unitCode },
      relations: ["representative"],
    });

    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  async findAllWithFilter(
    filterDto: UnitFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<UnitResponseDto>> {
    try {
      const config = {
        searchFields: ["name"],
        fieldTypeMap: {
          name: FieldType.TEXT,
        },
        defaultSorting: { field: "createdAt", direction: "DESC" as const },
        relations: [],
      };

      // Handle quick filters for backward compatibility
      if (filterDto.statusFilter || filterDto.unitTypeFilter) {
        // Add quick filter conditions to the existing conditions
        const quickFilterConditions = [];

        if (filterDto.unitTypeFilter) {
          quickFilterConditions.push({
            field: "type",
            fieldType: "select",
            operator: "equals",
            value: filterDto.unitTypeFilter,
          });
        }

        if (filterDto.statusFilter) {
          quickFilterConditions.push({
            field: "status",
            fieldType: "select",
            operator: "equals",
            value: filterDto.statusFilter,
          });
        }

        // Merge with existing conditions
        filterDto.conditions = [
          ...(filterDto.conditions || []),
          ...quickFilterConditions,
        ];
      }

      // Áp dụng rule phân quyền bắt buộc
      const permissionConditions = [];

      if (this.permissionHelper.isAdmin(currentUser)) {
        // Admin: Có thể xem tất cả units - không cần thêm điều kiện
      } else if (this.permissionHelper.isAdminDeptUser(currentUser)) {
        // AdminDept: unitId chính là campus ID, xem được tất cả units thuộc cơ sở này
        if (currentUser.unitId) {
          // Lấy tất cả unit IDs thuộc campus này (bao gồm campus và children)
          const allUnitIds = await this.getAllChildUnitIds(currentUser.unitId);
          if (allUnitIds.length > 0) {
            permissionConditions.push({
              field: "id",
              fieldType: "select",
              operator: allUnitIds.length === 1 ? "equals" : "in",
              value: allUnitIds,
            });
          } else {
            // Fallback: chỉ xem campus của mình
            permissionConditions.push({
              field: "id",
              fieldType: "select",
              operator: "equals",
              value: currentUser.unitId,
            });
          }
        } else {
          // Nếu không có unitId, trả về condition không thể match
          permissionConditions.push({
            field: "id",
            fieldType: "select",
            operator: "equals",
            value: "00000000-0000-0000-0000-000000000000", // UUID null không thể match
          });
        }
      } else if (this.permissionHelper.isUserDeptUser(currentUser)) {
        // UserDept: Chỉ xem được unit của mình
        if (currentUser.unitId) {
          permissionConditions.push({
            field: "id",
            fieldType: "select",
            operator: "equals",
            value: currentUser.unitId,
          });
        } else {
          // Nếu không có unitId, trả về condition không thể match
          permissionConditions.push({
            field: "id",
            fieldType: "select",
            operator: "equals",
            value: "00000000-0000-0000-0000-000000000000", // UUID null không thể match
          });
        }
      } else {
        // Người dùng không có role phù hợp - không được xem gì
        permissionConditions.push({
          field: "id",
          fieldType: "select",
          operator: "equals",
          value: "00000000-0000-0000-0000-000000000000", // UUID null không thể match
        });
      }

      // Merge permission conditions với existing conditions
      filterDto.conditions = [
        ...(filterDto.conditions || []),
        ...permissionConditions,
      ];

      return FilterUtil.getFilteredResults(
        this.unitRepository,
        filterDto,
        UnitResponseDto,
        config,
        "unit"
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}
