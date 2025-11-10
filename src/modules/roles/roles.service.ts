import { Role } from './../../entities/role.entity';
import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { Permission } from "../../entities/permission.entity";
import { RoleResponseDto } from "./dto/role-response.dto";
import { errorResponse } from "src/common/helpers/error-response";
import { CommonUtils } from "src/common/utils/common.utils";
import { ROLE_CODE_PREFIX } from "src/common/utils/constants";
import { ERR_EXISTS, NOT_FOUND } from "src/common/utils/error-type-response";
import { RoleBase } from "src/common/utils/role.enum";
import { User } from "src/entities/user.entity";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import { AccessScope } from "src/entities/access-scope.entity";

@Injectable()
export class RolesService {

    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        @InjectRepository(AccessScope)
        private readonly accessScopeRepository: Repository<AccessScope>,
        private permissionHelper: PermissionHelperService
    ) { }

    /**
     * create
     * @description Tạo vai trò mới với các quyền được chỉ định
     * @param createRoleDto Dữ liệu để tạo vai trò mới
     * @returns Vai trò đã được tạo dưới dạng RoleResponseDto
     * @throws BadRequestException Nếu vai trò với tên đã tồn tại
     * @throws NotFoundException Nếu bất kỳ quyền nào trong danh sách không tồn tại
     */
    async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
        try {
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
                code: CommonUtils.generateCode(createRoleDto.name, ROLE_CODE_PREFIX),
            });

            // Xử lý permissions
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

            // Xử lý access scope
            if (createRoleDto.accessScopeId) {
                const accessScope = await this.accessScopeRepository.findOne({
                    where: { id: createRoleDto.accessScopeId }
                });

                if (!accessScope) {
                    throw new NotFoundException(
                        errorResponse(NOT_FOUND, `Access scope with ID '${createRoleDto.accessScopeId}' not found`)
                    );
                }

                role.accessScopeId = createRoleDto.accessScopeId;
            }

            const savedRole = await this.roleRepository.save(role);
            return this.findOne(savedRole.id);
        }
        catch (error) {
            console.error('Error creating role:', error);
            throw error;
        }
    }

    /**
     * findAll
     * @description Lấy tất cả các vai trò cùng với các quyền liên quan
     * @param user User hiện tại để kiểm tra quyền
     * @returns Danh sách các vai trò dưới dạng RoleResponseDto[]
     */
    async findAll(
        user: User
    ): Promise<RoleResponseDto[]> {
        try {
            // Xác định các role cần loại bỏ dựa trên quyền của user
            let excludedRoles: string[] = [RoleBase.ADMIN];

            // Nếu là adminDept thì bỏ cả adminDept
            if (this.permissionHelper.isAdminDeptUser(user)) {
                excludedRoles.push(RoleBase.ADMIN_DEPT);
            }

            // Nếu là userDept thì bỏ cả admin và adminDept
            if (this.permissionHelper.isUserDeptUser(user)) {
                excludedRoles = [RoleBase.ADMIN, RoleBase.ADMIN_DEPT, RoleBase.USER_DEPT];
            }

            const roles = await this.roleRepository.find({
                where: { code: Not(In(excludedRoles)) },
                relations: ["permissions", "accessScope"],
                order: { createdAt: "DESC" },
            });

            return roles.map(this.transformToResponseDto);
        } catch (error) {
            console.error('Error fetching roles:', error);
            throw error;
        }
    }

    /**
     * findOne
     * @description Tìm vai trò theo ID cùng với các quyền liên quan
     * @param id ID của vai trò cần tìm
     * @returns Vai trò dưới dạng RoleResponseDto
     * @throws NotFoundException Nếu vai trò với ID không tồn tại
     */
    async findOne(id: string): Promise<RoleResponseDto> {
        try {
            const role = await this.roleRepository.findOne({
                where: { id },
                relations: ["permissions", "accessScope"],
            });

            if (!role) {
                throw new NotFoundException(errorResponse(NOT_FOUND, `Role not found`));
            }

            return this.transformToResponseDto(role);
        } catch (error) {
            console.error('Error fetching role:', error);
            throw error;
        }
    }

    /**
     * update
     * @description Cập nhật vai trò và các quyền liên quan
     * @param id ID của vai trò cần cập nhật
     * @param updateRoleDto Dữ liệu để cập nhật vai trò
     * @returns Vai trò đã được cập nhật dưới dạng RoleResponseDto
     * @throws NotFoundException Nếu vai trò hoặc bất kỳ quyền nào trong danh sách không tồn tại
     * @throws ConflictException Nếu tên vai trò mới đã được sử dụng bởi vai trò khác
     */
    async update(
        id: string,
        updateRoleDto: UpdateRoleDto
    ): Promise<RoleResponseDto> {
        try {
            const role = await this.roleRepository.findOne({
                where: { id },
                relations: ["permissions", "accessScope"],
            });

            if (!role) {
                throw new NotFoundException(errorResponse(NOT_FOUND, `Role not found`));
            }

            // if (role.isProtected) {
            //     throw new BadRequestException(
            //         errorResponse(ERR_EXISTS, `Cannot modify a protected role`)
            //     );
            // }

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
                role.code = CommonUtils.generateCode(updateRoleDto.name, ROLE_CODE_PREFIX);
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
                            errorResponse(NOT_FOUND, `Permissions ${notFoundIds.join(", ")} not found`)
                        );
                    }

                    role.permissions = permissions;
                } else {
                    role.permissions = [];
                }
            }

            // Cập nhật access scope nếu có
            if (updateRoleDto.accessScopeId !== undefined) {
                if (updateRoleDto.accessScopeId) {
                    const accessScope = await this.accessScopeRepository.findOne({
                        where: { id: updateRoleDto.accessScopeId }
                    });

                    if (!accessScope) {
                        throw new NotFoundException(
                            errorResponse(NOT_FOUND, `Access scope with ID '${updateRoleDto.accessScopeId}' not found`)
                        );
                    }

                    role.accessScope = accessScope;
                } else {
                    // Nếu accessScopeId là null hoặc empty string, xóa access scope
                    role.accessScope = null;
                }
            }

            await this.roleRepository.save(role);
            return this.findOne(id);
        } catch (error) {
            console.error('Error updating role:', error);
            throw error;
        }
    }

    /**
     * remove
     * @description Xóa vai trò theo ID (soft delete)
     * @param id ID của vai trò cần xóa
     * @returns None
     * @throws NotFoundException Nếu vai trò với ID không tồn tại
     */
    async remove(id: string): Promise<void> {
        const role = await this.roleRepository.findOne({
            where: { id },
        });

        if (role.isProtected) {
            throw new BadRequestException(
                errorResponse(ERR_EXISTS, `Cannot modify a protected role`)
            );
        }

        if (!role) {
            throw new NotFoundException(
                errorResponse(NOT_FOUND, `Role with ID ${id} not found`)
            );
        }

        await this.roleRepository.softDelete(id);
    }
    
    /**
     * getAvailableAccessScopes
     * @description Lấy tất cả các access scope có sẵn
     * @returns Danh sách các access scope có sẵn
     */
    async getAvailableAccessScopes(): Promise<AccessScope[]> {
        return this.accessScopeRepository.find({
            relations: ['unit'],
            order: { type: "ASC", createdAt: "DESC" },
        });
    }

    /**
     * findAllInventoryRoles
     * @description Lấy tất cả các vai trò ủy ban kiểm kê
     * @returns Danh sách các vai trò ủy ban kiểm kê
     */
    async findAllInventoryRoles(): Promise<RoleResponseDto[]> {
        const roles = await this.roleRepository.find({
            where: { code: In([RoleBase.INVENTORY_COMMITTEE_HEAD, RoleBase.INVENTORY_COMMITTEE_MEMBER, RoleBase.INVENTORY_COMMITTEE_SECRETARY]) },
            relations: ["permissions", "accessScope"],
        });

        return roles.map(this.transformToResponseDto);
    }

    /**
     * transformToResponseDto
     * @description Chuyển đổi thực thể Role thành RoleResponseDto
     * @param role Role entity
     * @returns RoleResponseDto
     */
    private transformToResponseDto(role: Role): RoleResponseDto {
        return {
            id: role.id,
            name: role.name,
            code: role.code,
            isProtected: role.isProtected,
            permissions:
                role.permissions?.map((permission) => ({
                    id: permission.id,
                    name: permission.name,
                    code: permission.code,
                })) ?? [],
            accessScope: role.accessScope ? {
                id: role.accessScope.id,
                type: role.accessScope.type,
                unitId: role.accessScope.unitId,
                description: role.accessScope.description,
            } : undefined,
        };
    }
}
