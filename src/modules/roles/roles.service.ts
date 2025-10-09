import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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
        catch (error) {
            console.error('Error creating role:', error);
            throw error;
        }
    }

    /**
     * findAll
     * @description Lấy tất cả các vai trò cùng với các quyền liên quan
     * @returns Danh sách các vai trò dưới dạng RoleResponseDto[]
     */
    async findAll(): Promise<RoleResponseDto[]> {
        try {
            const roles = await this.roleRepository.find({
                relations: ["permissions"],
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
                relations: ["permissions"],
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

        if (!role) {
            throw new NotFoundException(
                errorResponse(NOT_FOUND, `Role with ID ${id} not found`)
            );
        }

        await this.roleRepository.softDelete(id);
    }

    // Lấy tất cả permissions có sẵn (để sử dụng trong giao diện chọn)
    /**
     * getAvailablePermissions
     * @description Lấy tất cả các quyền có sẵn
     * @returns Danh sách các quyền có sẵn
     */
    async getAvailablePermissions(): Promise<Permission[]> {
        return this.permissionRepository.find({
            order: { name: "ASC" },
        });
    }

    /**
     * findAllInventoryRoles
     * @description Lấy tất cả các vai trò ủy ban kiểm kê
     * @returns Danh sách các vai trò ủy ban kiểm kê
     */
    async findAllInventoryRoles(): Promise<RoleResponseDto[]> {
        const roles = await this.roleRepository.find({
            where: { code: In(["INVENTORY_COMMITTEE_HEAD"]) },
            relations: ["permissions"],
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
            permissions:
                role.permissions?.map((permission) => ({
                    id: permission.id,
                    name: permission.name,
                    code: permission.code,
                })) ?? [],
        };
    }
}
