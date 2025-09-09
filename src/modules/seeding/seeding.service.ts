import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { ManagerPermission } from 'src/entities/manager-permission.entity';
import { PermissionConstants } from 'src/common/utils/permission.constant';

@Injectable()
export class SeedingService implements OnModuleInit {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(ManagerPermission)
    private readonly managerPermissionRepository: Repository<ManagerPermission>,
  ) {}

  async onModuleInit() {
    // Only run seeding in development or when explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.RUN_SEEDING === 'true') {
      await this.seedDatabase();
    }
  }

  async seedDatabase() {
    try {
      this.logger.log('Starting database seeding...');

      await this.seedPermissions();
      await this.seedRoles();
      await this.seedAdminUser();

      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during database seeding:', error);
    }
  }

  private async seedPermissions() {
    const managerPermissions = [
        {
            name: 'Quản lý người dùng',
            permissions: [
                {
                    name: 'Tạo người dùng', code: PermissionConstants.PERM_CREATE_USER
                },
                {
                    name: 'Chỉnh sửa người dùng', code: PermissionConstants.PERM_UPDATE_USER
                },
                {
                    name: 'Xóa người dùng', code: PermissionConstants.PERM_REMOVE_USER
                },
                {
                    name: 'Xem người dùng', code: PermissionConstants.PERM_VIEW_USER
                }
            ]
        },
        {
            name: 'Quản lý vai trò',
            permissions: [
                {
                    name: 'Tạo vai trò', code: PermissionConstants.PERM_CREATE_ROLE
                },
                {
                    name: 'Chỉnh sửa vai trò', code: PermissionConstants.PERM_UPDATE_ROLE
                },
                {
                    name: 'Xóa vai trò', code: PermissionConstants.PERM_REMOVE_ROLE
                },
                {
                    name: 'Xem vai trò', code: PermissionConstants.PERM_VIEW_ROLE
                }
            ]
        }
    ]
    for (const managerPermissionData of managerPermissions) {
        let managerPermission = await this.managerPermissionRepository.findOne({
            where: { name: managerPermissionData.name },
            relations: ['permissions'],
        })
        if(!managerPermission) {
            const permissions = [];

            for (const permData of managerPermissionData.permissions) {
                let permission = await this.permissionRepository.findOne({
                    where: { code: permData.code },
                });
                if (!permission) {
                    permission = this.permissionRepository.create(permData);
                    const createdPermission = await this.permissionRepository.save(permission);
                    permissions.push(createdPermission);
                }
            }

            const createManagement = this.managerPermissionRepository.create(managerPermissionData);
            const management = await this.managerPermissionRepository.save(createManagement);
            management.permissions = permissions;
            await this.managerPermissionRepository.save(management);
        }
    }
  }

  private async seedRoles() {
    // Create ADMIN role
    let adminRole = await this.roleRepository.findOne({
      where: { code: 'ADMIN' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      adminRole = this.roleRepository.create({
        name: 'Quản trị viên',
        code: 'ADMIN',
      });
      const permissions = await this.permissionRepository.find();
      adminRole.permissions = permissions;
      await this.roleRepository.save(adminRole);
      this.logger.log('Created ADMIN role');
    }
  }

  private async seedAdminUser() {
    let adminUser = await this.userRepository.findOne({
      where: { username: 'admin' },
      relations: ['roles'],
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      adminUser = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator',
        email: 'admin@iuh.edu.vn',
        status: UserStatus.ACTIVE,
        roles: [await this.roleRepository.findOne({ where: { code: 'ADMIN' } })],
      });
      
      await this.userRepository.save(adminUser);
      this.logger.log('Created ADMIN user');
    }
  }
}