import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";
import { RoleResponseDto } from "./dto/role-response.dto";
import { errorResponse } from "src/common/helpers/error-response";
import { CommonUtils } from "src/common/utils/common.utils";
import { ROLE_CODE_PREFIX } from "src/common/utils/constants";
import { ERR_EXISTS, NOT_FOUND } from "src/common/utils/error-type-response";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException(
        errorResponse(
          ERR_EXISTS,
          `Role with name '${createRoleDto.name}' already exists`
        )
      );
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      code: CommonUtils.generateCode(ROLE_CODE_PREFIX, createRoleDto.name),
    });

    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findByIds(
        createRoleDto.permissionIds
      );

      if (permissions.length !== createRoleDto.permissionIds.length) {
        const foundIds = permissions.map((p) => p.id);
        const notFoundIds = createRoleDto.permissionIds.filter(
          (id) => !foundIds.includes(id)
        );
        throw new NotFoundException(
          errorResponse(NOT_FOUND, `Permissions not found`)
        );
      }

      role.permissions = permissions;
    }

    const savedRole = await this.roleRepository.save(role);
    return this.findOne(savedRole.id);
  }

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.find({
      relations: ["permissions"],
      order: { createdAt: "DESC" },
    });

    return roles.map(this.transformToResponseDto);
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!role) {
      throw new NotFoundException(errorResponse(NOT_FOUND, `Role not found`));
    }

    return this.transformToResponseDto(role);
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!role) {
      throw new NotFoundException(errorResponse(NOT_FOUND, `Role not found`));
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(
          errorResponse(ERR_EXISTS, `Role already exists`)
        );
      }

      role.name = updateRoleDto.name;
      role.code = CommonUtils.generateCode(ROLE_CODE_PREFIX, updateRoleDto.name);
    }

    // Cập nhật permissions nếu có
    if (updateRoleDto.permissionIds !== undefined) {
      if (updateRoleDto.permissionIds.length > 0) {
        const permissions = await this.permissionRepository.findByIds(
          updateRoleDto.permissionIds
        );

        if (permissions.length !== updateRoleDto.permissionIds.length) {
          const foundIds = permissions.map((p) => p.id);
          const notFoundIds = updateRoleDto.permissionIds.filter(
            (id) => !foundIds.includes(id)
          );
          throw new NotFoundException(
            errorResponse(NOT_FOUND, `Permissions not found`)
          );
        }

        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    await this.roleRepository.save(role);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(
        errorResponse(NOT_FOUND, `Role with ID ${id} not found`)
      );
    }

    await this.roleRepository.softDelete(id);
  }

  // Lấy tất cả permissions có sẵn (để sử dụng trong giao diện chọn)
  async getAvailablePermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { name: "ASC" },
    });
  }

  private transformToResponseDto(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      permissions:
        role.permissions?.map((permission) => ({
          id: permission.id,
          name: permission.name,
          code: permission.code,
        })) ?? [],
    };
  }
}
