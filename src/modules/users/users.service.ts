import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Unit } from '../../entities/unit.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { errorResponse } from 'src/common/helpers/error-response';
import { ERR_EXISTS, NOT_FOUND } from 'src/common/utils/error-type-response';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { FieldType } from 'src/common/dto/filter.dto';
import { FilterUtil } from 'src/common/utils/filter.util';

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Unit)
        private readonly unitRepository: Repository<Unit>,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
        try {
            // Kiểm tra username đã tồn tại
            const existingUsername = await this.userRepository.findOne({
                where: { username: createUserDto.username }
            });
            if (existingUsername) {
                throw new BadRequestException(errorResponse(ERR_EXISTS, `Username '${createUserDto.username}' already exists`));
            }

            // Kiểm tra email đã tồn tại
            const existingEmail = await this.userRepository.findOne({
                where: { email: createUserDto.email }
            });
            if (existingEmail) {
                throw new BadRequestException(errorResponse(ERR_EXISTS, `Email '${createUserDto.email}' already exists`));
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

            // Tạo user mới
            const user = this.userRepository.create({
                username: createUserDto.username,
                password: hashedPassword,
                fullName: createUserDto.fullName,
                email: createUserDto.email,
                unitId: createUserDto.unitId,
                phoneNumber: createUserDto.phoneNumber,
                birthDate: createUserDto.birthDate,
                status: createUserDto.status,
            });

            // Kiểm tra và gán unit nếu có
            if (createUserDto.unitId) {
                const unit = await this.unitRepository.findOne({
                    where: { id: createUserDto.unitId }
                });
                if (!unit) {
                    throw new NotFoundException(errorResponse(NOT_FOUND, `Unit not found`));
                }
            }

            // Kiểm tra và gán roles nếu có
            if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
                const roles = await this.roleRepository.findByIds(createUserDto.roleIds);
                if (roles.length !== createUserDto.roleIds.length) {
                    throw new NotFoundException(errorResponse(NOT_FOUND, `Roles not found`));
                }
                user.roles = roles;
            }

            user.createdAt = new Date();
            user.updatedAt = new Date();
            
            const savedUser = await this.userRepository.save(user);

            return this.transformToResponseDto(savedUser);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user information
     * @description Update user details based on the provided UpdateUserDto.
     * @param updateUserDto Data to update user information
     * @returns Updated user information
     */
    async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userRepository.findOne({
            where: { id: id, status: UserStatus.ACTIVE },
            relations: ['roles']
        });

        if (!user) {
            throw new NotFoundException(errorResponse(NOT_FOUND, `User not found`));
        }

        // Kiểm tra username đã tồn tại
        if (updateUserDto.username && (updateUserDto.username !== user.username)) {
            const existingUsername = await this.userRepository.findOne({
                where: { username: updateUserDto.username }
            });
            if (existingUsername) {
                throw new BadRequestException(errorResponse(ERR_EXISTS, `Username '${updateUserDto.username}' already exists`));
            }
            user.username = updateUserDto.username;
        }

        // Kiểm tra email đã tồn tại
        if (updateUserDto.email && (updateUserDto.email !== user.email)) {
            const existingEmail = await this.userRepository.findOne({
                where: { email: updateUserDto.email }
            });
            if (existingEmail) {
                throw new BadRequestException(errorResponse(ERR_EXISTS, `Email '${updateUserDto.email}' already exists`));
            }
            user.email = updateUserDto.email;
        }

        // Cập nhật fullName nếu có
        if (updateUserDto.fullName) {
            user.fullName = updateUserDto.fullName;
        }

        // Cập nhật unit nếu có
        if (updateUserDto.unitId) {
            const unit = await this.unitRepository.findOne({
                where: { id: updateUserDto.unitId }
            });
            if (!unit) {
                throw new NotFoundException(errorResponse(NOT_FOUND, `Unit not found`));
            }
            user.unit = unit;
        }

        // Cập nhật phoneNumber nếu có
        if (updateUserDto.phoneNumber) {
            user.phoneNumber = updateUserDto.phoneNumber;
        }

        // Cập nhật birthDate nếu có
        if (updateUserDto.birthDate) {
            user.birthDate = updateUserDto.birthDate;
        }

        // Cập nhật status nếu có
        if (updateUserDto.status) {
            user.status = updateUserDto.status;
        }

        // Cập nhật roles nếu có
        if (updateUserDto.roleIds) {
            if (updateUserDto.roleIds.length > 0) {
                const roles = await this.roleRepository.findByIds(updateUserDto.roleIds);
                if (roles.length !== updateUserDto.roleIds.length) {
                    throw new NotFoundException(errorResponse(NOT_FOUND, `Roles not found`));
                }
                user.roles = roles;
            } else {
                user.roles = [];
            }
        }

        user.updatedAt = new Date();

        const updatedUser = await this.userRepository.save(user);
        return this.transformToResponseDto(updatedUser);
    }

    async findAll(): Promise<UserResponseDto[]> {
        const users = await this.userRepository.find({
            where: { deletedAt: null },
            relations: ['roles', 'roles.permissions', 'unit'],
            order: { createdAt: 'DESC' }
        });

        return users.map(this.transformToResponseDto);
    }

    async findWithPagination(filterDto: UserFilterDto): Promise<PaginatedResponseDto<UserResponseDto>> {
        try {
            // Define user-specific configuration
            const config = {
                searchFields: ["username", "fullName", "email"],
                fieldTypeMap: {
                    username: FieldType.TEXT,
                    fullName: FieldType.TEXT,
                    email: FieldType.TEXT,
                    status: FieldType.SELECT,
                    unitId: FieldType.SELECT,
                    phoneNumber: FieldType.TEXT,
                    birthDate: FieldType.DATE,
                    createdAt: FieldType.DATE,
                    updatedAt: FieldType.DATE,
                },
                defaultSorting: { field: "createdAt", direction: "DESC" as const },
                relations: ["roles", "unit"],
            };

            // Handle quick filters for backward compatibility
            if (filterDto.unitFilter || filterDto.statusFilter) {
                // Add quick filter conditions to the existing conditions
                const quickFilterConditions = [];

                if (filterDto.unitFilter) {
                    quickFilterConditions.push({
                        field: 'unitId',
                        fieldType: 'select',
                        operator: 'equals',
                        value: [filterDto.unitFilter]
                    });
                }

                if (filterDto.statusFilter) {
                    quickFilterConditions.push({
                        field: 'status',
                        fieldType: 'select',
                        operator: 'equals',
                        value: [filterDto.statusFilter]
                    });
                }

                // Merge with existing conditions
                filterDto.conditions = [
                    ...(filterDto.conditions || []),
                    ...quickFilterConditions
                ];
            }

            return FilterUtil.getFilteredResults(
                this.userRepository,
                filterDto,
                UserResponseDto,
                config,
                "user"
            );
        } catch (error) {
            console.error('Error finding users with pagination:', error);
            throw error;
        }
    }

    private transformToResponseDto(user: User): UserResponseDto {
        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            unitId: user.unitId,
            phoneNumber: user.phoneNumber,
            birthDate: user.birthDate,
            status: user.status,
            roles: user.roles?.map(role => ({
                id: role.id,
                name: role.name,
                code: role.code,
                permissions: role.permissions?.map(permission => ({
                    id: permission.id,
                    name: permission.name,
                    code: permission.code,
                })) ?? [],
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            })) ?? [],
            unit: user.unit ? {
                id: user.unit.id,
                name: user.unit.name,
            } : undefined,
        };
    }

    async findAllUserInventory(): Promise<UserResponseDto[]> {
        try {
            const inventoryRoleCodes = ["INVENTORY_COMMITTEE_HEAD", "INVENTORY_COMMITTEE_VICE_HEAD", "INVENTORY_COMMITTEE_SECRETARY", "INVENTORY_COMMITTEE_MEMBER", "INVENTORY_COMMITTEE_CHIEF_SECRETARY"];

            const users = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.roles', 'role')
                .where('user.status = :status', { status: UserStatus.ACTIVE })
                .andWhere('role.code IN (:...roleCodes)', { roleCodes: inventoryRoleCodes })
                .orderBy('user.createdAt', 'DESC')
                .getMany();

            return users.map(this.transformToResponseDto);
        } catch (error) {
            console.error('Error finding all user inventory:', error);
            throw error;
        }
    }

    /**
     * Lấy tất cả users có role codes liên quan đến kiểm kê
     * @description Trả về danh sách users có các role codes liên quan đến kiểm kê bao gồm:
     * - INVENTORY_COMMITTEE_HEAD: Trưởng ban kiểm kê
     * - INVENTORY_COMMITTEE_VICE_HEAD: Phó trưởng ban kiểm kê  
     * - INVENTORY_COMMITTEE_SECRETARY: Thư ký ban kiểm kê
     * - INVENTORY_COMMITTEE_MEMBER: Thành viên ban kiểm kê
     * - INVENTORY_COMMITTEE_CHIEF_SECRETARY: Thư ký trưởng ban kiểm kê
     * @returns Danh sách users có role liên quan đến kiểm kê
     */
    async findAllInventoryCommitteeUsers(): Promise<UserResponseDto[]> {
        try {
            const inventoryRoleCodes = [
                "INVENTORY_COMMITTEE_HEAD",
                "INVENTORY_COMMITTEE_VICE_HEAD",
                "INVENTORY_COMMITTEE_SECRETARY",
                "INVENTORY_COMMITTEE_MEMBER",
                "INVENTORY_COMMITTEE_CHIEF_SECRETARY",
                "INVENTORY_SUB_HEAD",
                "INVENTORY_SUB_SECRETARY",
                "INVENTORY_GROUP_HEAD",
                "INVENTORY_GROUP_SECRETARY",
                "INVENTORY_GROUP_MEMBER",
                "INVENTORY_SUB_MEMBER"
            ];

            const users = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.roles', 'role')
                .leftJoinAndSelect('role.permissions', 'permission')
                .leftJoinAndSelect('user.unit', 'unit')
                .where('user.status = :status', { status: UserStatus.ACTIVE })
                .andWhere('role.code IN (:...roleCodes)', { roleCodes: inventoryRoleCodes })
                .orderBy('user.fullName', 'ASC')
                .getMany();

            return users.map(this.transformToResponseDto);
        } catch (error) {
            console.error('Error finding all inventory committee users:', error);
            throw error;
        }
    }

    /**
     * findById
     * @description Tìm user theo ID
     * @param id ID user
     * @returns Thông tin user
     */
    async findById(id: string): Promise<UserResponseDto> {
        try {
            const user = await this.userRepository.findOne({
                where: { id, status: UserStatus.ACTIVE },
                relations: ['roles', 'unit'],
            });
            if (!user) throw new Error('User not found');
            return this.transformToResponseDto(user);
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * lockAccountUser
     * @description Khóa tài khoản user (cập nhật status thành LOCKED)
     * @param id ID user
     * @returns true nếu khóa thành công, false nếu không tìm thấy user
     */
    async updateStatus(id: string, status: UserStatus): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({ where: { id } });
            if (!user) {
                throw new NotFoundException(errorResponse(NOT_FOUND, `User not found`));
            }

            const result = await this.userRepository.update(user.id, { status, updatedAt: new Date() });

            if (result.affected && result.affected > 0) {
                return true;
            } else {
                throw new Error('Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }
}
