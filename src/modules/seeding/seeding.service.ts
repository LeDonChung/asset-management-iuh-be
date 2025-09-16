import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User, UserStatus } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";
import { ManagerPermission } from "src/entities/manager-permission.entity";
import { PermissionConstants } from "src/common/utils/permission.constant";

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
    private readonly managerPermissionRepository: Repository<ManagerPermission>
  ) {}

  async onModuleInit() {
    // Only run seeding in development or when explicitly enabled
    await this.seedDatabase();
  }

  async seedDatabase() {
    try {
      this.logger.log("Starting database seeding...");

      await this.seedPermissions();
      await this.seedRoles();
      await this.seedAdminUser();
      await this.seedInventoryUsers();
      this.logger.log("Database seeding completed successfully");
    } catch (error) {
      this.logger.error("Error during database seeding:", error);
    }
  }

  private async seedPermissions() {
    const managerPermissions = [
      {
        name: "Quản lý người dùng",
        permissions: [
          {
            name: "Tạo người dùng",
            code: PermissionConstants.PERM_CREATE_USER,
          },
          {
            name: "Chỉnh sửa người dùng",
            code: PermissionConstants.PERM_UPDATE_USER,
          },
          {
            name: "Xóa người dùng",
            code: PermissionConstants.PERM_REMOVE_USER,
          },
          {
            name: "Xem người dùng",
            code: PermissionConstants.PERM_VIEW_USER,
          },
        ],
      },
      {
        name: "Quản lý vai trò",
        permissions: [
          {
            name: "Tạo vai trò",
            code: PermissionConstants.PERM_CREATE_ROLE,
          },
          {
            name: "Chỉnh sửa vai trò",
            code: PermissionConstants.PERM_UPDATE_ROLE,
          },
          {
            name: "Xóa vai trò",
            code: PermissionConstants.PERM_REMOVE_ROLE,
          },
          {
            name: "Xem vai trò",
            code: PermissionConstants.PERM_VIEW_ROLE,
          },
        ],
      },
      {
        name: "Quản lý thể loại",
        permissions: [
          {
            name: "Tạo thể loại",
            code: PermissionConstants.PERM_CREATE_CATEGORY,
          },
          {
            name: "Chỉnh sửa thể loại",
            code: PermissionConstants.PERM_UPDATE_CATEGORY,
          },
          {
            name: "Xóa thể loại",
            code: PermissionConstants.PERM_REMOVE_CATEGORY,
          },
          {
            name: "Xem thể loại",
            code: PermissionConstants.PERM_VIEW_CATEGORY,
          },
        ],
      },
      {
        name: "Quản lý đơn vị",
        permissions: [
          {
            name: "Tạo đơn vị",
            code: PermissionConstants.PERM_CREATE_UNIT,
          },
          {
            name: "Chỉnh sửa đơn vị",
            code: PermissionConstants.PERM_UPDATE_UNIT,
          },
          {
            name: "Xóa đơn vị",
            code: PermissionConstants.PERM_REMOVE_UNIT,
          },
          {
            name: "Xem đơn vị",
            code: PermissionConstants.PERM_VIEW_UNIT,
          },
        ],
      },
      {
        name: "Quản lý phòng",
        permissions: [
          {
            name: "Tạo phòng",
            code: PermissionConstants.PERM_CREATE_ROOM,
          },
          {
            name: "Chỉnh sửa phòng",
            code: PermissionConstants.PERM_UPDATE_ROOM,
          },
          {
            name: "Xóa phòng",
            code: PermissionConstants.PERM_REMOVE_ROOM,
          },
          {
            name: "Xem phòng",
            code: PermissionConstants.PERM_VIEW_ROOM,
          },
        ],
      },
      {
        name: "Quản lý tài sản",
        permissions: [
          {
            name: "Chỉnh sửa tài sản",
            code: PermissionConstants.PERM_UPDATE_ASSET,
          },
          {
            name: "Xóa tài sản",
            code: PermissionConstants.PERM_REMOVE_ASSET,
          },
          {
            name: "Xem tài sản",
            code: PermissionConstants.PERM_VIEW_ASSET,
          },
          {
            name: "Định danh tài sản",
            code: PermissionConstants.PERM_IDENTIFY_ASSET,
          },
          {
            name: "Cập nhật RFID",
            code: PermissionConstants.PERM_UPDATE_RFID,
          },
          {
            name: "Xóa RFID",
            code: PermissionConstants.PERM_REMOVE_RFID,
          },
          {
            name: "Nhập khẩu tài sản",
            code: PermissionConstants.PERM_IMPORT_ASSET,
          },
        ],
      },
      {
        name: "Quản lý kiểm kê",
        permissions: [
          {
            name: "Tạo kỳ kiểm kê",
            code: PermissionConstants.PERM_CREATE_INVENTORY,
          },
          {
            name: "Chỉnh sửa kỳ kiểm kê",
            code: PermissionConstants.PERM_UPDATE_INVENTORY,
          },
          {
            name: "Xóa kỳ kiểm kê",
            code: PermissionConstants.PERM_REMOVE_INVENTORY,
          },
          {
            name: "Xem kỳ kiểm kê",
            code: PermissionConstants.PERM_VIEW_INVENTORY,
          },
        ],
      },
      {
        name: "Quản lý nhóm kiểm kê",
        permissions: [
          {
            name: "Tạo nhóm kiểm kê",
            code: PermissionConstants.PERM_CREATE_INVENTORY_GROUP,
          },
          {
            name: "Chỉnh sửa nhóm kiểm kê",
            code: PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          },
          {
            name: "Xóa nhóm kiểm kê",
            code: PermissionConstants.PERM_REMOVE_INVENTORY_GROUP,
          },
          {
            name: "Xem nhóm kiểm kê",
            code: PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          },
          {
            name: "Phân công nhóm kiểm kê",
            code: PermissionConstants.PERM_ASSIGN_INVENTORY_GROUP,
          },
          {
            name: "Quản lý thành viên nhóm",
            code: PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          },
        ],
      },
      {
        name: "Quản lý tiểu ban kiểm kê",
        permissions: [
          {
            name: "Tạo tiểu ban kiểm kê",
            code: PermissionConstants.PERM_CREATE_INVENTORY_SUB,
          },
          {
            name: "Chỉnh sửa tiểu ban kiểm kê",
            code: PermissionConstants.PERM_UPDATE_INVENTORY_SUB,
          },
          {
            name: "Xóa tiểu ban kiểm kê",
            code: PermissionConstants.PERM_REMOVE_INVENTORY_SUB,
          },
          {
            name: "Xem tiểu ban kiểm kê",
            code: PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          },
          {
            name: "Quản lý thành viên tiểu ban",
            code: PermissionConstants.PERM_MANAGE_SUB_MEMBERS,
          },
        ],
      },
      {
        name: "Quản lý ban kiểm kê",
        permissions: [
          {
            name: "Phê duyệt kết quả kiểm kê",
            code: PermissionConstants.PERM_APPROVE_INVENTORY_RESULT,
          },
          {
            name: "Xem xét báo cáo kiểm kê",
            code: PermissionConstants.PERM_REVIEW_INVENTORY_REPORT,
          },
          {
            name: "Hoàn thiện kiểm kê",
            code: PermissionConstants.PERM_FINALIZE_INVENTORY,
          },
        ],
      },
    ];
    for (const managerPermissionData of managerPermissions) {
      let managerPermission = await this.managerPermissionRepository.findOne({
        where: { name: managerPermissionData.name },
        relations: ["permissions"],
      });
      if (!managerPermission) {
        const permissions = [];

        for (const permData of managerPermissionData.permissions) {
          let permission = await this.permissionRepository.findOne({
            where: { code: permData.code },
          });
          if (!permission) {
            permission = this.permissionRepository.create(permData);
            const createdPermission =
              await this.permissionRepository.save(permission);
            permissions.push(createdPermission);
          }
        }

        const createManagement = this.managerPermissionRepository.create(
          managerPermissionData
        );
        const management =
          await this.managerPermissionRepository.save(createManagement);
        management.permissions = permissions;
        await this.managerPermissionRepository.save(management);
      }
    }
  }

  private async seedRoles() {
    // Create ADMIN role
    let adminRole = await this.roleRepository.findOne({
      where: { code: "ADMIN" },
      relations: ["permissions"],
    });

    if (!adminRole) {
      adminRole = this.roleRepository.create({
        name: "Quản trị viên",
        code: "ADMIN",
      });
      const permissions = await this.permissionRepository.find();
      adminRole.permissions = permissions;
      await this.roleRepository.save(adminRole);
      this.logger.log("Created ADMIN role");
    } else {
      // Ensure ADMIN role has all permissions
      const permissions = await this.permissionRepository.find();
      adminRole.permissions = permissions;
      await this.roleRepository.save(adminRole);
      this.logger.log("Updated ADMIN role with all permissions");
    }

    // Create inventory committee roles
    await this.createInventoryRoles();
  }

  private async createInventoryRoles() {
    const inventoryRoles = [
      {
        name: "Trưởng ban kiểm kê",
        code: "INVENTORY_COMMITTEE_HEAD",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_CREATE_INVENTORY,
          PermissionConstants.PERM_UPDATE_INVENTORY,
          PermissionConstants.PERM_REMOVE_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_CREATE_INVENTORY_SUB,
          PermissionConstants.PERM_UPDATE_INVENTORY_SUB,
          PermissionConstants.PERM_REMOVE_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_CREATE_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_REMOVE_INVENTORY_GROUP,
          PermissionConstants.PERM_APPROVE_INVENTORY_RESULT,
          PermissionConstants.PERM_REVIEW_INVENTORY_REPORT,
          PermissionConstants.PERM_FINALIZE_INVENTORY,
          PermissionConstants.PERM_ASSIGN_INVENTORY_GROUP,
          PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          PermissionConstants.PERM_MANAGE_SUB_MEMBERS,
        ],
      },
      {
        name: "Phó trưởng ban kiểm kê",
        code: "INVENTORY_COMMITTEE_VICE_HEAD",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
        ],
      },
      {
        name: "Thư ký ban kiểm kê",
        code: "INVENTORY_COMMITTEE_SECRETARY",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_UPDATE_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_UPDATE_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_REVIEW_INVENTORY_REPORT,
          PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          PermissionConstants.PERM_MANAGE_SUB_MEMBERS,
        ],
      },
      {
        name: "Ủy viên ban kiểm kê",
        code: "INVENTORY_COMMITTEE_MEMBER",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
        ],
      },
      {
        name: "Thư ký tổng hợp ban kiểm kê",
        code: "INVENTORY_COMMITTEE_CHIEF_SECRETARY",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
        ],
      },
      {
        name: "Trưởng tiểu ban kiểm kê",
        code: "INVENTORY_SUB_HEAD",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_UPDATE_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_CREATE_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_REMOVE_INVENTORY_GROUP,
          PermissionConstants.PERM_ASSIGN_INVENTORY_GROUP,
          PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          PermissionConstants.PERM_MANAGE_SUB_MEMBERS,
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_IDENTIFY_ASSET,
        ],
      },
      {
        name: "Thư ký tiểu ban kiểm kê",
        code: "INVENTORY_SUB_SECRETARY",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_UPDATE_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          PermissionConstants.PERM_MANAGE_SUB_MEMBERS,
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_IDENTIFY_ASSET,
        ],
      },
      {
        name: "Trưởng nhóm kiểm kê",
        code: "INVENTORY_GROUP_HEAD",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_MANAGE_GROUP_MEMBERS,
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_IDENTIFY_ASSET,
          PermissionConstants.PERM_UPDATE_RFID,
        ],
      },
      {
        name: "Thư ký nhóm kiểm kê",
        code: "INVENTORY_GROUP_SECRETARY",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY_SUB,
          PermissionConstants.PERM_VIEW_INVENTORY_GROUP,
          PermissionConstants.PERM_UPDATE_INVENTORY_GROUP,
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_IDENTIFY_ASSET,
          PermissionConstants.PERM_UPDATE_RFID,
        ],
      },
    ];

    for (const roleData of inventoryRoles) {
      let role = await this.roleRepository.findOne({
        where: { code: roleData.code },
        relations: ["permissions"],
      });

      if (!role) {
        role = this.roleRepository.create({
          name: roleData.name,
          code: roleData.code,
        });

        const permissions = await this.permissionRepository.find({
          where: roleData.permissions.map(code => ({ code })),
        });

        role.permissions = permissions;
        await this.roleRepository.save(role);
        this.logger.log(`Created ${roleData.name} role`);
      } else {
        // Update permissions for existing role
        const permissions = await this.permissionRepository.find({
          where: roleData.permissions.map(code => ({ code })),
        });
        role.permissions = permissions;
        await this.roleRepository.save(role);
        this.logger.log(`Updated ${roleData.name} role permissions`);
      }
    }
  }

  private async seedAdminUser() {
    let adminUser = await this.userRepository.findOne({
      where: { username: "admin" },
      relations: ["roles"],
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("Admin@123", 12);

      adminUser = this.userRepository.create({
        username: "admin",
        password: hashedPassword,
        fullName: "Administrator",
        email: "admin@iuh.edu.vn",
        status: UserStatus.ACTIVE,
        roles: [
          await this.roleRepository.findOne({ where: { code: "ADMIN" } }),
        ],
      });

      await this.userRepository.save(adminUser);
      this.logger.log("Created ADMIN user");
    }
  }

  private async seedInventoryUsers() {
    const inventoryUsers = [
      {
        username: "truongban_kiemke",
        fullName: "Nguyễn Văn Trưởng",
        email: "truongban.kiemke@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "thuky_ban_kiemke",
        fullName: "Trần Thị Thư",
        email: "thuky.ban.kiemke@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },
      {
        username: "truong_tieuban_1",
        fullName: "Lê Văn Minh",
        email: "truong.tieuban1@iuh.edu.vn",
        roleCode: "INVENTORY_SUB_HEAD",
      },
      {
        username: "thuky_tieuban_1",
        fullName: "Phạm Thị Lan",
        email: "thuky.tieuban1@iuh.edu.vn",
        roleCode: "INVENTORY_SUB_SECRETARY",
      },
      {
        username: "truong_tieuban_2",
        fullName: "Hoàng Văn Đức",
        email: "truong.tieuban2@iuh.edu.vn",
        roleCode: "INVENTORY_SUB_HEAD",
      },
      {
        username: "thuky_tieuban_2",
        fullName: "Võ Thị Hương",
        email: "thuky.tieuban2@iuh.edu.vn",
        roleCode: "INVENTORY_SUB_SECRETARY",
      },
      {
        username: "truong_nhom_1",
        fullName: "Đặng Văn Hùng",
        email: "truong.nhom1@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_HEAD",
      },
      {
        username: "thuky_nhom_1",
        fullName: "Ngô Thị Mai",
        email: "thuky.nhom1@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_SECRETARY",
      },
      {
        username: "truong_nhom_2",
        fullName: "Bùi Văn Tài",
        email: "truong.nhom2@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_HEAD",
      },
      {
        username: "thuky_nhom_2",
        fullName: "Lý Thị Nga",
        email: "thuky.nhom2@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_SECRETARY",
      },
      {
        username: "truong_nhom_3",
        fullName: "Phan Văn Long",
        email: "truong.nhom3@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_HEAD",
      },
      {
        username: "thuky_nhom_3",
        fullName: "Đỗ Thị Yến",
        email: "thuky.nhom3@iuh.edu.vn",
        roleCode: "INVENTORY_GROUP_SECRETARY",
      },
    ];

    const defaultPassword = "Inventory@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    for (const userData of inventoryUsers) {
      let user = await this.userRepository.findOne({
        where: { username: userData.username },
        relations: ["roles"],
      });

      if (!user) {
        const role = await this.roleRepository.findOne({
          where: { code: userData.roleCode },
        });

        if (role) {
          user = this.userRepository.create({
            username: userData.username,
            password: hashedPassword,
            fullName: userData.fullName,
            email: userData.email,
            status: UserStatus.ACTIVE,
            roles: [role],
          });

          await this.userRepository.save(user);
          this.logger.log(`Created user: ${userData.username} with role: ${role.name}`);
        } else {
          this.logger.warn(`Role ${userData.roleCode} not found for user ${userData.username}`);
        }
      } else {
        this.logger.log(`User ${userData.username} already exists`);
      }
    }
  }
}
