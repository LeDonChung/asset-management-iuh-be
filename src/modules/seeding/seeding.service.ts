import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User, UserStatus } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";
import { ManagerPermission } from "src/entities/manager-permission.entity";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Category } from "src/entities/category.entity";
import { CommonUtils } from "src/common/utils/common.utils";
import { UnitType } from "src/common/shared/UnitType";
import { Unit } from "src/entities/unit.entity";
import { Room } from "src/entities/room.entity";
import { RoomStatus } from "src/common/shared/RoomStatus";
import { RoleBase } from "src/common/utils/role.enum";
import { AccessScope, AccessScopeType } from "src/entities/access-scope.entity";

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
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(AccessScope)
    private readonly accessScopeRepository: Repository<AccessScope>
  ) {}

  async onModuleInit() {
    // Only run seeding in development or when explicitly enabled
    await this.seedDatabase();
  }

  async seedDatabase() {
    try {
      this.logger.log("Starting database seeding...");

      await this.seedPermissions();
      await this.seedAccessScopes();
      await this.seedRoles();
      await this.seedAdminUser();
      await this.seedInventoryUsers();
      await this.seedUnits();
      await this.seedCategories();
      await this.seedInventoryRoomsForExistingDepts();
      this.logger.log("Database seeding completed successfully");
    } catch (error) {
      this.logger.error("Error during database seeding:", error);
    }
  }

  private async seedCategories() {
    const categories = [
      {
        name: "Máy in",
      },
      {
        name: "Thiết bị văn phòng",
      },
      {
        name: "Máy tính",
      },
      {
        name: "Máy chiếu",
      },
      {
        name: "Điều hòa",
      },
      {
        name: "Bàn ghế",
      },
      {
        name: "Tủ kệ",
      },
      {
        name: "Máy photocopy",
      },
    ];
    for (const category of categories) {
      let categoryFind = await this.categoryRepository.findOne({
        where: { name: category.name },
      });
      if (!categoryFind) {
        const categoryCreate = this.categoryRepository.create(category);
        categoryCreate.code = CommonUtils.generateCode(category.name);
        await this.categoryRepository.save(categoryCreate);
      }
    }
  }

  async generateUnitCode(): Promise<number> {
    const count = await this.unitRepository.count();
    return count + 1;
  }

  private async generateRoomCode(
    building: string,
    floor: string,
    roomNumber: string,
    unitId?: string
  ): Promise<string> {
    const buildingPart = building.toUpperCase();
    const floorPart = floor.padStart(2, "0");
    const roomNumberPart = roomNumber.padStart(2, "0");
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
    });
    return `${unit?.unitCode ?? ""}${buildingPart}${floorPart}.${roomNumberPart}`;
  }

  private async seedUnits() {
    // Create three units type Campus
    const unitsCampus = [
      {
        name: "Cơ sở Gò Vấp",
        type: UnitType.CAMPUS,
      },
      {
        name: "Cơ sở Thanh Hóa",
        type: UnitType.CAMPUS,
      },
      {
        name: "Cơ sở Phạm Văn Chiêu",
        type: UnitType.CAMPUS,
      },
    ];

    const unitsCampusCreated = [];
    for (const unit of unitsCampus) {
      let unitFind = await this.unitRepository.findOne({
        where: { name: unit.name },
      });
      if (!unitFind) {
        const unitCreate = this.unitRepository.create(unit);
        unitCreate.unitCode = await this.generateUnitCode();
        const value = await this.unitRepository.save(unitCreate);
        unitsCampusCreated.push(value);
      } else {
        return;
      }
    }

    const unitsUserDept = [
      {
        name: "Khoa Công nghệ thông tin",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Cơ khí",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Động Lực",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Công nghệ May thời trang",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Công nghệ Điện",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Công nghệ Điện tử",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Công nghệ Nhiệt - lạnh",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Khoa Công nghệ Hóa học",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Viện CNSH&TP",
        type: UnitType.USER_DEPT,
      },
      {
        name: "Viện KHCN&QLMT",
        type: UnitType.USER_DEPT,
      },
    ];

    const unitsUserDeptCreated = [];
    for (const unit of unitsCampusCreated) {
      for (const unitUserDept of unitsUserDept) {
        let unitFind = await this.unitRepository.findOne({
          where: { name: unitUserDept.name, parentUnit: { id: unit.id } },
        });
        if (!unitFind) {
          const unitCreate = this.unitRepository.create(unitUserDept);
          unitCreate.unitCode = await this.generateUnitCode();
          unitCreate.parentUnit = unit;
          const value = await this.unitRepository.save(unitCreate);
          unitsUserDeptCreated.push(value);
        } else {
          unitsUserDeptCreated.push(unitFind);
        }
      }
    }

    // Define building, floor, and room structure
    const buildings = ["A", "B"]; // Each department gets 2 buildings
    const floors = ["1", "2", "3", "4", "5"]; // 5 floors per building
    const roomNumbers = ["01", "02", "03", "04", "05"]; // 5 rooms per floor

    // Create rooms for each department in each campus
    for (const campus of unitsCampusCreated) {
      for (const dept of unitsUserDeptCreated.filter(
        (d) => d.parentUnit.id === campus.id
      )) {
        for (const building of buildings) {
          for (const floor of floors) {
            const roomsCreated = []; // Track rooms on this floor for adjacent room assignment
            for (let i = 0; i < roomNumbers.length; i++) {
              const roomNumber = roomNumbers[i];
              const floorPart = floor.padStart(2, "0");
              const roomCreate = this.roomRepository.create({
                name: `${building}${floorPart}.${roomNumber}`,
                building,
                floor,
                roomNumber,
                status: RoomStatus.ACTIVE,
                unit: dept,
                adjacentRooms: [],
              });

              // Generate unique room code
              roomCreate.roomCode = await this.generateRoomCode(
                building,
                floor,
                roomNumber,
                dept.id
              );

              // Save the room first to ensure it exists in the database
              const savedRoom = await this.roomRepository.save(roomCreate);
              roomsCreated.push(savedRoom);
            }

            // Assign adjacent rooms (after all rooms on the floor are saved)
            for (let i = 0; i < roomsCreated.length; i++) {
              const room = roomsCreated[i];
              room.adjacentRooms = [];

              // Add previous room as adjacent (if it exists)
              if (i > 0) {
                room.adjacentRooms.push(roomsCreated[i - 1]);
              }
              // Add next room as adjacent (if it exists)
              if (i < roomsCreated.length - 1) {
                room.adjacentRooms.push(roomsCreated[i + 1]);
              }

              // Save the room with updated adjacent rooms
              await this.roomRepository.save(room);

              // Update adjacent rooms to include this room
              if (room.adjacentRooms.length > 0) {
                for (const adjRoom of room.adjacentRooms) {
                  adjRoom.adjacentRooms = [
                    ...(adjRoom.adjacentRooms ?? []),
                    room,
                  ];
                  await this.roomRepository.save(adjRoom);
                }
              }
            }
          }
        }
      }
    }

    // Create inventory room for each department
    await this.seedInventoryRooms(unitsUserDeptCreated);
  }

  private async seedInventoryRooms(departments: any[]) {
    for (const dept of departments) {
      const inventoryRoomCode = `${dept.unitCode}INVENTORY`;
      
      // Check if inventory room already exists for this department
      const existingInventoryRoom = await this.roomRepository.findOne({
        where: { 
          roomCode: inventoryRoomCode,
          unit: { id: dept.id }
        }
      });

      if (!existingInventoryRoom) {
        const inventoryRoom = this.roomRepository.create({
          name: "Kho",
          building: "INVENTORY",
          floor: "00",
          roomNumber: dept.unitCode.toString().padStart(2, "0"), // Use unitCode as roomNumber to ensure uniqueness
          status: RoomStatus.ACTIVE,
          unit: dept,
          roomCode: inventoryRoomCode,
          adjacentRooms: [],
        });

        await this.roomRepository.save(inventoryRoom);
        this.logger.log(`Created inventory room for department: ${dept.name} with code: ${inventoryRoom.roomCode}`);
      }
    }
  }

  private async seedInventoryRoomsForExistingDepts() {
    // Tìm tất cả các đơn vị USER_DEPT hiện có trong database
    const userDepts = await this.unitRepository.find({
      where: { type: UnitType.USER_DEPT }
    });

    this.logger.log(`Found ${userDepts.length} USER_DEPT units to create inventory rooms for`);

    for (const dept of userDepts) {
      const inventoryRoomCode = `${dept.unitCode}INVENTORY`;
      
      // Kiểm tra xem phòng kho đã tồn tại chưa
      const existingInventoryRoom = await this.roomRepository.findOne({
        where: { 
          roomCode: inventoryRoomCode,
          unit: { id: dept.id }
        }
      });

      if (!existingInventoryRoom) {
        const inventoryRoom = this.roomRepository.create({
          name: "Kho",
          building: "INVENTORY",
          floor: "00", 
          roomNumber: dept.unitCode.toString().padStart(2, "0"), // Use unitCode as roomNumber to ensure uniqueness
          status: RoomStatus.ACTIVE,
          unit: dept,
          roomCode: inventoryRoomCode,
          adjacentRooms: [],
        });

        await this.roomRepository.save(inventoryRoom);
        this.logger.log(`Created inventory room for existing department: ${dept.name} with code: ${inventoryRoom.roomCode}`);
      } else {
        this.logger.log(`Inventory room already exists for department: ${dept.name}`);
      }
    }
  }

  private async seedPermissions() {
    const managerPermissions = [
      {
        name: "Quản lý người dùng",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_USER,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_USER,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_USER,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_USER,
          },
        ],
      },
      {
        name: "Quản lý vai trò",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_ROLE,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_ROLE,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_ROLE,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_ROLE,
          },
        ],
      },
      {
        name: "Quản lý thể loại",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_CATEGORY,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_CATEGORY,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_CATEGORY,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_CATEGORY,
          },
        ],
      },
      {
        name: "Quản lý đơn vị",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_UNIT,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_UNIT,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_UNIT,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_UNIT,
          },
        ],
      },
      {
        name: "Quản lý tài sản",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_ASSET,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_ASSET,
          },
          {
            name: "Chỉnh sửa",
            code: PermissionConstants.PERM_UPDATE_ASSET,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_ASSET,
          },
          {
            name: "Định danh",
            code: PermissionConstants.PERM_IDENTIFY_ASSET,
          },
        ],
      },
      {
        name: "Quản lý cảnh báo",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_ALERT,
          },
          {
            name: "Xử lý",
            code: PermissionConstants.PERM_RESOLVE_ALERT,
          },
        ],
      },
      {
        name: "Quản lý kiểm kê",
        permissions: [
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_INVENTORY,
          },
          {
            name: "Chỉnh sửa",
            code: PermissionConstants.PERM_UPDATE_INVENTORY,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_INVENTORY,
          },
          {
            name: "Xem kết quả",
            code: PermissionConstants.PERM_VIEW_RESULT_INVENTORY,
          },
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_INVENTORY,
          },
          {
            name: "Thực hiện",
            code: PermissionConstants.PERM_PERFORM_INVENTORY,
          },
        ],
      },
      {
        name: "Quản lý thanh lý",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_LIQUIDATION,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_LIQUIDATION,
          },
          {
            name: "Phê duyệt",
            code: PermissionConstants.PERM_APPROVE_LIQUIDATION,
          },
          {
            name: "Từ chối",
            code: PermissionConstants.PERM_REJECT_LIQUIDATION,
          },
          {
            name: "Hoàn thành",
            code: PermissionConstants.PERM_FINALIZED_LIQUIDATION,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_LIQUIDATION,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_LIQUIDATION,
          },
          {
            name: "Đề xuất thanh lý",
            code: PermissionConstants.PERM_PROPOSED_LIQUIDATION,
          },
        ],
      },
      {
        name: "Quản lý bàn giao",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_TRANSACTION,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_TRANSACTION,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_TRANSACTION,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_TRANSACTION,
          },
          {
            name: "Đề xuất",
            code: PermissionConstants.PERM_PROPOSE_TRANSACTION,
          },
          {
            name: "Phê duyệt",
            code: PermissionConstants.PERM_APPROVE_TRANSACTION,
          },
          {
            name: "Từ chối",
            code: PermissionConstants.PERM_REJECT_TRANSACTION,
          }
        ],
      },
      {
        name: "Quản lý di chuyển",
        permissions: [
          {
            name: "Xem",
            code: PermissionConstants.PERM_VIEW_MOVEMENT,
          },
          {
            name: "Tạo",
            code: PermissionConstants.PERM_CREATE_MOVEMENT,
          },
          {
            name: "Cập nhật",
            code: PermissionConstants.PERM_UPDATE_MOVEMENT,
          },
          {
            name: "Xóa",
            code: PermissionConstants.PERM_REMOVE_MOVEMENT,
          },
          {
            name: "Phê duyệt",
            code: PermissionConstants.PERM_APPROVE_MOVEMENT,
          },
          {
            name: "Từ chối",
            code: PermissionConstants.PERM_REJECT_MOVEMENT,
          },
          {
            name: "Đề xuất",
            code: PermissionConstants.PERM_PROPOSE_MOVEMENT,
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

  private async seedAccessScopes() {
    const accessScopes = [
      {
        type: AccessScopeType.GLOBAL,
        description: "Toàn hệ thống - Admin"
      },
      {
        type: AccessScopeType.UNIT,
        description: "Chỉ unit được chỉ định"
      },
      {
        type: AccessScopeType.CHILD_UNITS,
        description: "Unit và các unit con - Admin Dept"
      },
      {
        type: AccessScopeType.SELF,
        description: "Chỉ dữ liệu của chính mình"
      }
    ];

    for (const scopeData of accessScopes) {
      let scope = await this.accessScopeRepository.findOne({
        where: { type: scopeData.type, unitId: null }
      });
      
      if (!scope) {
        scope = await this.accessScopeRepository.save(
          this.accessScopeRepository.create(scopeData)
        );
        this.logger.log(`Created access scope: ${scopeData.type}`);
      }
    }
  }

  private async seedRoles() {
    // Lấy access scopes
    const globalScope = await this.accessScopeRepository.findOne({
      where: { type: AccessScopeType.GLOBAL }
    });
    const childUnitsScope = await this.accessScopeRepository.findOne({
      where: { type: AccessScopeType.CHILD_UNITS }
    });
    const unitScope = await this.accessScopeRepository.findOne({
      where: { type: AccessScopeType.UNIT }
    });

    const roleConfigs = [
      {
        code: RoleBase.ADMIN,
        name: "Quản trị viên",
        accessScopeId: globalScope?.id,
        getAllPermissions: true
      },
      {
        code: RoleBase.ADMIN_DEPT,
        name: "Trưởng phòng quản trị",
        accessScopeId: childUnitsScope?.id,
        permissions: [
          PermissionConstants.PERM_VIEW_USER,
          PermissionConstants.PERM_CREATE_USER,
          PermissionConstants.PERM_UPDATE_USER,
          PermissionConstants.PERM_VIEW_UNIT,
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_CREATE_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_VIEW_CATEGORY,
          PermissionConstants.PERM_CREATE_CATEGORY,
          PermissionConstants.PERM_UPDATE_CATEGORY,
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_CREATE_INVENTORY,
          PermissionConstants.PERM_UPDATE_INVENTORY,
        ]
      },
      {
        code: RoleBase.USER_DEPT,
        name: "Trưởng đơn vị sử dụng",
        accessScopeId: unitScope?.id,
        permissions: [
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_CREATE_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_VIEW_CATEGORY,
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_TRANSACTION,
          PermissionConstants.PERM_CREATE_TRANSACTION,
        ]
      },
      {
        code: RoleBase.TECHNICAL_STAFF,
        name: "Nhân viên kỹ thuật",
        accessScopeId: unitScope?.id,
        permissions: [
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_VIEW_MOVEMENT,
          PermissionConstants.PERM_CREATE_MOVEMENT,
          PermissionConstants.PERM_VIEW_TRANSACTION,
        ]
      },
      {
        code: RoleBase.TECHNICAL_MANAGER,
        name: "Trưởng phòng kỹ thuật",
        accessScopeId: childUnitsScope?.id,
        permissions: [
          PermissionConstants.PERM_VIEW_ASSET,
          PermissionConstants.PERM_CREATE_ASSET,
          PermissionConstants.PERM_UPDATE_ASSET,
          PermissionConstants.PERM_VIEW_MOVEMENT,
          PermissionConstants.PERM_CREATE_MOVEMENT,
          PermissionConstants.PERM_UPDATE_MOVEMENT,
          PermissionConstants.PERM_APPROVE_MOVEMENT,
          PermissionConstants.PERM_REJECT_MOVEMENT,
          PermissionConstants.PERM_VIEW_TRANSACTION,
          PermissionConstants.PERM_CREATE_TRANSACTION,
          PermissionConstants.PERM_APPROVE_TRANSACTION,
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_CATEGORY,
        ]
      }
    ];

    for (const config of roleConfigs) {
      let role = await this.roleRepository.findOne({
        where: { code: config.code }
      });

      if (!role) {
        role = this.roleRepository.create({
          name: config.name,
          code: config.code,
          accessScopeId: config.accessScopeId,
          isProtected: true,
        });

        if (config.getAllPermissions) {
          const permissions = await this.permissionRepository.find();
          role.permissions = permissions;
        } else if (config.permissions) {
          const permissions = await this.permissionRepository.find({
            where: config.permissions.map(code => ({ code }))
          });
          role.permissions = permissions;
        }

        await this.roleRepository.save(role);
        this.logger.log(`Created role: ${config.name} with access scope: ${config.accessScopeId ? 'assigned' : 'none'}`);
      }
    }

    // Create inventory committee roles
    await this.createInventoryRoles();
  }

  private async createInventoryRoles() {
    const inventoryRoles = [
      {
        name: "Ban kiểm kê",
        code: "INVENTORY_COMMITTEE_HEAD",
        permissions: [
          PermissionConstants.PERM_PERFORM_INVENTORY,
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_RESULT_INVENTORY,
        ],
      },
      {
        name: "Thành viên kiểm kê",
        code: "INVENTORY_COMMITTEE_MEMBER",
        permissions: [PermissionConstants.PERM_PERFORM_INVENTORY],
      },
      {
        name: "Thư ký kiểm kê",
        code: "INVENTORY_COMMITTEE_SECRETARY",
        permissions: [
          PermissionConstants.PERM_VIEW_INVENTORY,
          PermissionConstants.PERM_VIEW_RESULT_INVENTORY,
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
          isProtected: true,
        });

        const permissions = await this.permissionRepository.find({
          where: roleData.permissions.map((code) => ({ code })),
        });

        role.permissions = permissions;
        await this.roleRepository.save(role);
        this.logger.log(`Created ${roleData.name} role`);
      } else {
        // Update permissions for existing role
        const permissions = await this.permissionRepository.find({
          where: roleData.permissions.map((code) => ({ code })),
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
      // Ban kiểm kê chính
      {
        username: "nguyen_xuan_hong",
        fullName: "Nguyễn Xuân Hồng",
        email: "nguyenxuanhong@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "nguyen_quy_tuan",
        fullName: "Nguyễn Quý Tuấn",
        email: "nguyenquytuan@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "pham_thi_que_minh",
        fullName: "Phạm Thị Quế Minh",
        email: "phamthiqueminh@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "nguyen_truong_thi",
        fullName: "Nguyễn Trường Thi",
        email: "nguyentruongthi@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "tran_thanh_hai",
        fullName: "Trần Thanh Hải",
        email: "tranthanhai@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "nguyen_thi_ha",
        fullName: "Nguyễn Thị Hà",
        email: "nguyenthiha@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "pham_viet_hung",
        fullName: "Phạm Việt Hùng",
        email: "phamviethung@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "pham_thi_thuy_trang",
        fullName: "Phạm Thị Thúy Trang",
        email: "phamthithuytrang@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },
      {
        username: "dang_ich_hai",
        fullName: "Đặng Ích Hải",
        email: "dangichai@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_HEAD",
      },

      // Tiểu ban 1: Công nghệ (CN Cơ khí, CN Động lực, CN May thời trang)
      {
        username: "diep_bao_tri",
        fullName: "Điệp Bảo Trí",
        email: "diepbaotri@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "hoang_kim_phuoc",
        fullName: "Hoàng Kim Phước",
        email: "hoangkimphuoc@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 2: Công nghệ (CN Điện, CN Điện tử, CN TT, CN Nhiệt - Lạnh)
      {
        username: "nguyen_ngoc_son",
        fullName: "Nguyễn Ngọc Sơn",
        email: "nguyenngocson@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "dao_thi_hong_hanh",
        fullName: "Đào Thị Hồng Hạnh",
        email: "daothihonghanh@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 3: Công nghệ (CN Hóa học, Viện CNSH&TP, Viện KHCN&QLMT, Viện Tài chính – Kế toán)
      {
        username: "nguyen_huu_trung",
        fullName: "Nguyễn Hữu Trung",
        email: "nguyenhuutrung@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "nao_thanh_an",
        fullName: "Nào Thanh An",
        email: "naothanhan@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 4: Khối Kinh tế
      {
        username: "hoang_xanh",
        fullName: "Hoàng Xanh",
        email: "hoangxanh@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "dam_thanh_tan",
        fullName: "Đàm Thanh Tấn",
        email: "damthanhtan@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 5: Khối Phòng, Ban
      {
        username: "nguyen_thi_mai_phuong",
        fullName: "Nguyễn Thị Mai Phương",
        email: "nguyenthimaiphuong@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "lam_anh_thu",
        fullName: "Lâm Anh Thư",
        email: "lamanhthu@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 6: Thư viện, Nhà Xuất Bản
      {
        username: "mai_thi_tam",
        fullName: "Mai Thị Tâm",
        email: "maithitam@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "pham_ngan_trang",
        fullName: "Phạm Ngân Trang",
        email: "phamnhantrang@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 7: Nhà đất
      {
        username: "dinh_hong_nam",
        fullName: "Đinh Hồng Nam",
        email: "dinhhongnam@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "dang_vu_khoa",
        fullName: "Đặng Vũ Khoa",
        email: "dangvukhoa@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 2 (Cơ sở 2)
      {
        username: "le_duy_tho",
        fullName: "Lê Duy Thọ",
        email: "leduytho@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "pham_thi_my_thuan",
        fullName: "Phạm Thị Mỹ Thuận",
        email: "phamthimythuan@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },

      // Tiểu ban 3 (Cơ sở 3)
      {
        username: "pham_thai_hoa",
        fullName: "Phạm Thái Hòa",
        email: "phamthaihoa@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_MEMBER",
      },
      {
        username: "phan_anh_tu",
        fullName: "Phan Anh Tú",
        email: "phananhtu@iuh.edu.vn",
        roleCode: "INVENTORY_COMMITTEE_SECRETARY",
      },
    ];

    const defaultPassword = "Admin@123";
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
          this.logger.log(
            `Created user: ${userData.username} with role: ${role.name}`
          );
        } else {
          this.logger.warn(
            `Role ${userData.roleCode} not found for user ${userData.username}`
          );
        }
      } else {
        this.logger.log(`User ${userData.username} already exists`);
      }
    }
  }
}
