import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventorySessionResponseDto } from "./dto/inventory-response.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { InventorySessionMemberResponseDto } from "./dto/member-response.dto";
import { InventoryFilterDto } from "./dto/inventory-filter.dto";
import { InventorySession } from "src/entities/inventory-session.entity";
import { FileUrl } from "src/entities/file-url.entity";
import { InventorySessionUnit } from "src/entities/inventory-session-unit.entity";
import { InventorySessionMember } from "src/entities/inventory-session-member.entity";
import { Unit } from "src/entities/unit.entity";
import { User } from "src/entities/user.entity";
import { CommitteeRole } from "src/common/shared/CommitteeRole";
import { plainToInstance } from "class-transformer";
import { FilterUtil } from "src/common/utils/filter.util";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { FieldType } from "src/common/dto/filter.dto";
import { InventorySessionStatus } from "src/common/shared/InventorySessionStatus";
import { InventoryGroupMember } from "src/entities/inventory-group-member.entity";
import { InventoryGroupAssignmentDto } from "../inventory-group/dto/inventory-group-response.dto";
import { InventoryGroup } from "src/entities/inventory-group";
import { InventoryGroupAssignment } from "src/entities/inventory-group-assignment";
import { InventoryResult } from "src/entities/inventory-result";
import { Asset } from "src/entities/asset.entity";
import { RedisService } from "../redis/redis.service";
import { SaveTempInventoryDto, AssetInventoryDetail } from "./dto/save-temp-inventory.dto";
import { TempInventoryResponseDto } from "./dto/temp-inventory-response.dto";
import { SubmitInventoryResultDto } from "./dto/submit-inventory-result.dto";
import { SubmitInventoryResultResponseDto } from "./dto/submit-inventory-result-response.dto";
import { SaveTempAdjacentInventoryDto } from "./dto/save-temp-adjacent-inventory.dto";
import { TempAdjacentInventoryResponseDto } from "./dto/temp-adjacent-inventory-response.dto";

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(InventorySession)
    private inventorySessionRepository: Repository<InventorySession>,
    @InjectRepository(FileUrl)
    private fileUrlRepository: Repository<FileUrl>,
    @InjectRepository(InventorySessionUnit)
    private inventorySessionUnitRepository: Repository<InventorySessionUnit>,
    @InjectRepository(InventorySessionMember)
    private inventorySessionMemberRepository: Repository<InventorySessionMember>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InventoryGroupMember)
    private inventoryGroupMemberRepository: Repository<InventoryGroupMember>,
    @InjectRepository(InventoryGroup)
    private inventoryGroupRepository: Repository<InventoryGroup>,
    @InjectRepository(InventoryGroupAssignment)
    private inventoryGroupAssignmentRepository: Repository<InventoryGroupAssignment>,
    @InjectRepository(InventoryResult)
    private inventoryResultRepository: Repository<InventoryResult>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    private redisService: RedisService
  ) {}

  async create(
    createInventoryDto: CreateInventoryDto,
    currentUser?: User
  ): Promise<InventorySessionResponseDto> {
    const { fileUrls, unitIds, ...inventoryData } = createInventoryDto;

    // Validation: Kiểm tra người tạo có tồn tại không
    if (!currentUser) {
      throw new UnauthorizedException("Người dùng không hợp lệ");
    }

    // Validation: Kiểm tra ngày bắt đầu và kết thúc
    const startDate = new Date(inventoryData.startDate);
    const endDate = new Date(inventoryData.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
    }

    if (startDate < new Date()) {
      throw new BadRequestException(
        "Ngày bắt đầu không được nhỏ hơn ngày hiện tại"
      );
    }

    // Validation: Kiểm tra tên kỳ kiểm kê đã tồn tại trong năm này chưa
    const existingSession = await this.inventorySessionRepository.findOne({
      where: {
        year: inventoryData.year,
        period: inventoryData.period,
      },
    });

    if (existingSession) {
      throw new BadRequestException(
        `Kỳ kiểm kê "${inventoryData.name}" đã tồn tại trong năm ${inventoryData.year}`
      );
    }

    // Validation: Kiểm tra units nếu có
    if (unitIds && unitIds.length > 0) {
      const units = await this.unitRepository.findBy({ id: In(unitIds) });
      if (units.length !== unitIds.length) {
        throw new BadRequestException("Một hoặc nhiều đơn vị không tồn tại");
      }
    }

    // Validation: Kiểm tra format URL nếu có
    if (fileUrls && fileUrls.length > 0) {
      const urlRegex = /^https?:\/\/.+/;
      const invalidUrls = fileUrls.filter((url) => !urlRegex.test(url));
      if (invalidUrls.length > 0) {
        throw new BadRequestException(
          "Một hoặc nhiều URL hình ảnh không hợp lệ"
        );
      }
    }

    // Tạo inventory session
    const inventorySession = this.inventorySessionRepository.create({
      ...inventoryData,
      startDate,
      endDate,
      createdBy: currentUser.id,
    });

    // Tạo file URLs nếu có
    let fileUrlsSave: FileUrl[] = [];
    if (fileUrls && fileUrls.length > 0) {
      fileUrlsSave = fileUrls.map((url) => {
        const fileUrl = this.fileUrlRepository.create({ url });
        return fileUrl;
      });
    }

    // Gán fileUrls trước
    inventorySession.fileUrls = fileUrlsSave;

    // Lưu inventory session trước để có ID
    const savedSession =
      await this.inventorySessionRepository.save(inventorySession);

    // Tạo inventory session units với sessionId đã có
    if (unitIds && unitIds.length > 0) {
      const inventorySessionUnits = unitIds.map((unitId) =>
        this.inventorySessionUnitRepository.create({
          sessionId: savedSession.id,
          unitId,
        })
      );
      await this.inventorySessionUnitRepository.save(inventorySessionUnits);
    }

    return this.findOne(savedSession.id);
  }

  async findAll(): Promise<InventorySessionResponseDto[]> {
    const sessions = await this.inventorySessionRepository.find({
      relations: [
        "creator",
        "fileUrls",
        "inventorySessionUnits",
        "inventorySessionUnits.unit",
        "inventorySessionUnits.subInventory",
        "inventorySessionUnits.subInventory.members",
        "inventorySessionUnits.subInventory.members.user",
        "inventorySessionUnits.subInventory.groups",
        "inventorySessionUnits.subInventory.groups.members",
        "inventorySessionUnits.subInventory.groups.members.user",
        "inventorySessionUnits.subInventory.groups.assignments",
        "inventorySessionUnits.subInventory.groups.assignments.unit",
      ],
      order: { createdAt: "DESC" },
    });

    return plainToInstance(InventorySessionResponseDto, sessions, {
      excludeExtraneousValues: true,
    });
  }

  async findAllWithFilter(
    filterDto: InventoryFilterDto
  ): Promise<PaginatedResponseDto<InventorySessionResponseDto>> {
    try {
      // Define inventory-specific configuration
      const config = {
        searchFields: ["name"],
        fieldTypeMap: {
          name: FieldType.TEXT,
          period: FieldType.NUMBER,
          status: FieldType.SELECT,
          isGlobal: FieldType.BOOLEAN,
          year: FieldType.NUMBER,
          startDate: FieldType.DATE,
          endDate: FieldType.DATE,
        },
        defaultSorting: { field: "status", direction: "DESC" as const },
        relations: ["fileUrls", "inventorySessionUnits"],
      };

      // Handle quick filters for backward compatibility
      if (filterDto.statusFilter || filterDto.yearFilter) {
        // Add quick filter conditions to the existing conditions
        const quickFilterConditions = [];

        if (filterDto.statusFilter && filterDto.statusFilter.length > 0) {
          quickFilterConditions.push({
            field: "status",
            fieldType: "select",
            operator: "in",
            value: filterDto.statusFilter,
          });
        }

        if (filterDto.yearFilter && filterDto.yearFilter.length > 0) {
          quickFilterConditions.push({
            field: "year",
            fieldType: "number",
            operator: "in",
            value: filterDto.yearFilter,
          });
        }

        // Merge with existing conditions
        filterDto.conditions = [
          ...(filterDto.conditions || []),
          ...quickFilterConditions,
        ];
      }

      return FilterUtil.getFilteredResults(
        this.inventorySessionRepository,
        filterDto,
        InventorySessionResponseDto,
        config,
        "inventory"
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findOne(id: string): Promise<InventorySessionResponseDto> {
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: [
        "creator",
        "fileUrls",
        "members",
        "members.user",
        "members.user.roles",
        "inventorySessionUnits",
        "inventorySessionUnits.unit",
        "inventorySessionUnits.subInventory",
        "inventorySessionUnits.subInventory.members",
        "inventorySessionUnits.subInventory.members.user",
        "inventorySessionUnits.subInventory.groups",
        "inventorySessionUnits.subInventory.groups.members",
        "inventorySessionUnits.subInventory.groups.members.user",
        "inventorySessionUnits.subInventory.groups.assignments",
        "inventorySessionUnits.subInventory.groups.assignments.unit",
      ],
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Inventory session với ID ${id} không tồn tại`
      );
    }

    return plainToInstance(InventorySessionResponseDto, inventorySession, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto
  ): Promise<InventorySessionResponseDto> {
    const { fileUrls, unitIds, ...updateData } = updateInventoryDto;

    // Kiểm tra inventory session có tồn tại không
    const existingSession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: ["fileUrls", "inventorySessionUnits"],
    });

    if (!existingSession) {
      throw new NotFoundException(
        `Inventory session với ID ${id} không tồn tại`
      );
    }

    // Validation: Kiểm tra ngày bắt đầu và kết thúc nếu có cập nhật
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate
        ? new Date(updateData.startDate)
        : existingSession.startDate;
      const endDate = updateData.endDate
        ? new Date(updateData.endDate)
        : existingSession.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException(
          "Ngày bắt đầu phải nhỏ hơn ngày kết thúc"
        );
      }

      if (startDate < new Date()) {
        throw new BadRequestException(
          "Ngày bắt đầu không được nhỏ hơn ngày hiện tại"
        );
      }
    }

    // Validation: Kiểm tra tên kỳ kiểm kê đã tồn tại trong năm này chưa (nếu có cập nhật tên)
    if (updateData.name && updateData.name !== existingSession.name) {
      const year = updateData.year || existingSession.year;
      const existingSessionWithSamePeriod =
        await this.inventorySessionRepository.findOne({
          where: {
            period: updateData.period,
            year: year,
          },
        });

      if (
        existingSessionWithSamePeriod &&
        existingSessionWithSamePeriod.id !== id
      ) {
        throw new BadRequestException(
          `Kỳ kiểm kê "${updateData.name}" đã tồn tại trong năm ${year}`
        );
      }
    }

    // Validation: Kiểm tra units nếu có cập nhật
    if (unitIds !== undefined) {
      if (unitIds.length > 0) {
        const units = await this.unitRepository.findBy({ id: In(unitIds) });
        if (units.length !== unitIds.length) {
          throw new BadRequestException("Một hoặc nhiều đơn vị không tồn tại");
        }
      }
    }

    // Validation: Kiểm tra format URL nếu có cập nhật
    if (fileUrls !== undefined && fileUrls.length > 0) {
      const urlRegex = /^https?:\/\/.+/;
      const invalidUrls = fileUrls.filter((url) => !urlRegex.test(url));
      if (invalidUrls.length > 0) {
        throw new BadRequestException(
          "Một hoặc nhiều URL hình ảnh không hợp lệ"
        );
      }
    }

    // Cập nhật thông tin cơ bản
    if (Object.keys(updateData).length > 0) {
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate) as any;
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate) as any;
      }

      Object.assign(existingSession, updateData);
    }

    // Xử lý file URLs
    if (fileUrls !== undefined) {
      // Xóa các file URLs cũ
      if (existingSession.fileUrls && existingSession.fileUrls.length > 0) {
        await this.fileUrlRepository.remove(existingSession.fileUrls);
      }

      // Tạo file URLs mới nếu có
      if (fileUrls.length > 0) {
        const newFileUrls = fileUrls.map((url) =>
          this.fileUrlRepository.create({ url })
        );
        existingSession.fileUrls = newFileUrls;
      } else {
        existingSession.fileUrls = [];
      }
    }

    // Save tất cả trong một lần
    const savedSession =
      await this.inventorySessionRepository.save(existingSession);
    // Xử lý units
    if (unitIds !== undefined) {
      // Xóa các inventory session units cũ
      if (
        existingSession.inventorySessionUnits &&
        existingSession.inventorySessionUnits.length > 0
      ) {
        await this.inventorySessionUnitRepository.remove(
          existingSession.inventorySessionUnits
        );
      }

      // Tạo inventory session units mới nếu có
      if (unitIds && unitIds.length > 0) {
        const inventorySessionUnits = unitIds.map((unitId) =>
          this.inventorySessionUnitRepository.create({
            inventorySession: existingSession,
            unitId,
          })
        );
        await this.inventorySessionUnitRepository.save(inventorySessionUnits);
      }
    }
    return this.findOne(savedSession.id);
  }

  async updateStatus(
    id: string,
    status: InventorySessionStatus
  ): Promise<boolean> {
    try {
      if (!Object.values(InventorySessionStatus).includes(status)) {
        throw new BadRequestException(`Trạng thái '${status}' không hợp lệ`);
      }

      const inventorySession = await this.inventorySessionRepository.findOne({
        where: { id },
      });

      if (!inventorySession) {
        throw new NotFoundException(
          `Inventory session với ID ${id} không tồn tại`
        );
      }

      const currentStatus = inventorySession.status;

      const statusOrder = [
        InventorySessionStatus.PLANNED,
        InventorySessionStatus.IN_PROGRESS,
        InventorySessionStatus.COMPLETED,
        InventorySessionStatus.CLOSED,
      ];

      const currentIndex = statusOrder.indexOf(currentStatus);
      const newIndex = statusOrder.indexOf(status);

      if (newIndex < currentIndex) {
        throw new BadRequestException(
          `Không thể chuyển từ trạng thái '${currentStatus}' về '${status}'`
        );
      }

      inventorySession.status = status;
      await this.inventorySessionRepository.save(inventorySession);
      return true;
    } catch (error) {
      console.error("Error updating inventory session status:", error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    // Kiểm tra inventory session có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id },
      relations: ["fileUrls", "inventorySessionUnits"],
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Inventory session với ID ${id} không tồn tại`
      );
    }

    // Validation: Kiểm tra trạng thái có thể xóa không
    if (inventorySession.status === "IN_PROGRESS") {
      throw new BadRequestException(
        "Không thể xóa kỳ kiểm kê đang trong quá trình thực hiện"
      );
    }

    // Xóa các file URLs liên quan
    if (inventorySession.fileUrls && inventorySession.fileUrls.length > 0) {
      await this.fileUrlRepository.remove(inventorySession.fileUrls);
    }

    // Xóa các inventory session units liên quan
    if (
      inventorySession.inventorySessionUnits &&
      inventorySession.inventorySessionUnits.length > 0
    ) {
      await this.inventorySessionUnitRepository.remove(
        inventorySession.inventorySessionUnits
      );
    }

    // Xóa inventory session (soft delete)
    await this.inventorySessionRepository.softDelete(id);
  }

  // === MEMBER MANAGEMENT METHODS ===

  async addMember(
    inventorySessionId: string,
    addMemberDto: AddMemberDto,
    currentUser: User
  ): Promise<InventorySessionMemberResponseDto> {
    // Kiểm tra kỳ kiểm kê có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id: inventorySessionId },
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Kỳ kiểm kê với ID ${inventorySessionId} không tồn tại`
      );
    }

    // Kiểm tra user có tồn tại không
    const user = await this.userRepository.findOne({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User với ID ${addMemberDto.userId} không tồn tại`
      );
    }

    // Kiểm tra user đã là thành viên chưa
    const existingMember = await this.inventorySessionMemberRepository.findOne({
      where: {
        inventorySessionId,
        userId: addMemberDto.userId,
      },
    });

    if (existingMember) {
      throw new ConflictException("User đã là thành viên của ban kiểm kê này");
    }

    // Tạo thành viên mới
    const newMember = this.inventorySessionMemberRepository.create({
      inventorySessionId,
      userId: addMemberDto.userId,
      role: addMemberDto.role,
      createdBy: currentUser.id,
    });

    const savedMember =
      await this.inventorySessionMemberRepository.save(newMember);

    // Lấy thông tin chi tiết để trả về
    const memberWithUser = await this.inventorySessionMemberRepository.findOne({
      where: { id: savedMember.id },
      relations: ["user"],
    });

    return plainToInstance(InventorySessionMemberResponseDto, memberWithUser, {
      excludeExtraneousValues: true,
    });
  }

  async getMembers(
    inventorySessionId: string
  ): Promise<InventorySessionMemberResponseDto[]> {
    // Kiểm tra kỳ kiểm kê có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id: inventorySessionId },
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Kỳ kiểm kê với ID ${inventorySessionId} không tồn tại`
      );
    }

    const members = await this.inventorySessionMemberRepository.find({
      where: { inventorySessionId },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });

    return plainToInstance(InventorySessionMemberResponseDto, members, {
      excludeExtraneousValues: true,
    });
  }

  async updateMember(
    inventorySessionId: string,
    memberId: string,
    updateMemberDto: UpdateMemberDto,
    currentUser: User
  ): Promise<InventorySessionMemberResponseDto> {
    // Tìm thành viên
    const member = await this.inventorySessionMemberRepository.findOne({
      where: {
        id: memberId,
        inventorySessionId,
      },
      relations: ["user"],
    });

    if (!member) {
      throw new NotFoundException(
        "Không tìm thấy thành viên trong ban kiểm kê này"
      );
    }

    // Cập nhật thông tin
    if (updateMemberDto.role !== undefined) {
      member.role = updateMemberDto.role;
    }

    const updatedMember =
      await this.inventorySessionMemberRepository.save(member);

    return plainToInstance(InventorySessionMemberResponseDto, updatedMember, {
      excludeExtraneousValues: true,
    });
  }

  async removeMember(
    inventorySessionId: string,
    memberId: string
  ): Promise<void> {
    // Tìm thành viên
    const member = await this.inventorySessionMemberRepository.findOne({
      where: {
        id: memberId,
        inventorySessionId,
      },
    });

    if (!member) {
      throw new NotFoundException(
        "Không tìm thấy thành viên trong ban kiểm kê này"
      );
    }

    await this.inventorySessionMemberRepository.delete(memberId);
  }

  async getMembersByRole(
    inventorySessionId: string,
    role: string
  ): Promise<InventorySessionMemberResponseDto[]> {
    // Kiểm tra kỳ kiểm kê có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id: inventorySessionId },
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Kỳ kiểm kê với ID ${inventorySessionId} không tồn tại`
      );
    }

    // Validate role
    if (!Object.values(CommitteeRole).includes(role as CommitteeRole)) {
      throw new BadRequestException(`Vai trò '${role}' không hợp lệ`);
    }

    const members = await this.inventorySessionMemberRepository.find({
      where: {
        inventorySessionId,
        role: role as CommitteeRole,
      },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });

    return plainToInstance(InventorySessionMemberResponseDto, members, {
      excludeExtraneousValues: true,
    });
  }

  async getAssignedInventories(
    currentUser: User
  ): Promise<InventorySessionResponseDto[]> {
    console.log('Finding assigned inventories for user:', currentUser.id);
    
    const inventorySessions = await this.inventorySessionRepository
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.inventorySessionUnits", "isu")
      .leftJoinAndSelect("isu.subInventory", "si")
      .leftJoinAndSelect("si.groups", "g")
      .leftJoinAndSelect("g.members", "m")
      .leftJoinAndSelect("session.creator", "creator")
      .where("m.userId = :userId", {
        userId: currentUser.id,
      })
      .andWhere("session.status = :status", {
        status: InventorySessionStatus.IN_PROGRESS,
      })
      .andWhere("session.deletedAt IS NULL")
      .andWhere("isu.deletedAt IS NULL")
      .andWhere("si.deletedAt IS NULL")
      .andWhere("g.deletedAt IS NULL")
      .andWhere("m.deletedAt IS NULL")
      .orderBy("session.createdAt", "DESC")
      .getMany();

    if (inventorySessions.length === 0) {
      // Kiểm tra xem user có tồn tại trong inventory group members không
      const userInGroups = await this.inventoryGroupMemberRepository
        .createQueryBuilder("m")
        .leftJoinAndSelect("m.group", "g")
        .leftJoinAndSelect("g.subInventory", "si")
        .leftJoinAndSelect("si.inventorySessionUnit", "isu")
        .leftJoinAndSelect("isu.inventorySession", "session")
        .where("m.userId = :userId", { userId: currentUser.id })
        .andWhere("m.deletedAt IS NULL")
        .getMany();
        
      // Kiểm tra các session đang IN_PROGRESS
      const activeSessions = await this.inventorySessionRepository
        .createQueryBuilder("session")
        .where("session.status = :status", {
          status: InventorySessionStatus.IN_PROGRESS,
        })
        .andWhere("session.deletedAt IS NULL")
        .getMany();
    }

    return plainToInstance(InventorySessionResponseDto, inventorySessions, {
      excludeExtraneousValues: true,
    });
  }

  async getAssignedMembersInSession(
    inventorySessionId: string,
    groupId: string
  ): Promise<InventoryGroupAssignmentDto[]> {
    // Kiểm tra kỳ kiểm kê có tồn tại không
    const inventorySession = await this.inventorySessionRepository.findOne({
      where: { id: inventorySessionId },
    });

    if (!inventorySession) {
      throw new NotFoundException(
        `Kỳ kiểm kê với ID ${inventorySessionId} không tồn tại`
      );
    }

    // Kiểm tra nhóm có tồn tại không
    const group = await this.inventoryGroupRepository.findOne({
      where: { id: groupId },
      relations: ["assignments", "assignments.unit"],
    })

    if (!group) {
      throw new NotFoundException(
        `Nhóm với ID ${groupId} không tồn tại`
      );
    }
    
    return plainToInstance(InventoryGroupAssignmentDto, group.assignments, {
      excludeExtraneousValues: true,
    });
  }

  // === REDIS TEMPORARY INVENTORY METHODS ===

  /**
   * Lưu kết quả kiểm kê tạm thời vào Redis
   */
  async saveTempInventoryResults(
    saveTempInventoryDto: SaveTempInventoryDto
  ): Promise<TempInventoryResponseDto> {
    const { roomId, unitId, sessionId, inventoryResults, note, ttlSeconds = 86400 } = saveTempInventoryDto;

    // Tạo key cho Redis
    const redisKey = `temp_inventory:${roomId}`;

    // Tính toán thống kê
    const stats = this.calculateInventoryStats(inventoryResults);

    // Tạo dữ liệu để lưu
    const tempData = {
      roomId,
      unitId,
      sessionId,
      inventoryResults,
      note,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      ...stats,
    };

    try {
      // Lưu vào Redis với TTL
      await this.redisService.set(redisKey, tempData, ttlSeconds);

      // Lấy TTL hiện tại
      const currentTtl = await this.redisService.ttl(redisKey);

      return {
        ...tempData,
        ttl: currentTtl,
      };
    } catch (error) {
      throw new BadRequestException(`Không thể lưu kết quả kiểm kê tạm thời: ${error.message}`);
    }
  }

  /**
   * Tính toán thống kê từ kết quả kiểm kê
   */
  private calculateInventoryStats(inventoryResults: { [assetId: string]: AssetInventoryDetail }) {
    const stats = {
      totalAssets: 0,
      matchedAssets: 0,
      missingAssets: 0,
      excessAssets: 0,
      brokenAssets: 0,
      needsRepairAssets: 0,
      liquidationProposedAssets: 0,
    };

    Object.values(inventoryResults).forEach((result) => {
      stats.totalAssets += result.quantity;
      
      switch (result.status) {
        case 'MATCHED':
          stats.matchedAssets += result.quantity;
          break;
        case 'MISSING':
          stats.missingAssets += result.quantity;
          break;
        case 'EXCESS':
          stats.excessAssets += result.quantity;
          break;
        case 'BROKEN':
          stats.brokenAssets += result.quantity;
          break;
        case 'NEEDS_REPAIR':
          stats.needsRepairAssets += result.quantity;
          break;
        case 'LIQUIDATION_PROPOSED':
          stats.liquidationProposedAssets += result.quantity;
          break;
      }
    });

    return stats;
  }

  /**
   * Lấy kết quả kiểm kê tạm thời từ Redis theo roomId
   */
  async getTempInventoryResults(roomId: string): Promise<TempInventoryResponseDto | null> {
    const redisKey = `temp_inventory:${roomId}`;

    try {
      const tempData = await this.redisService.get<TempInventoryResponseDto>(redisKey);
      
      if (!tempData) {
        return null;
      }

      // Lấy TTL hiện tại
      const currentTtl = await this.redisService.ttl(redisKey);

      return {
        ...tempData,
        ttl: currentTtl,
      };
    } catch (error) {
      throw new BadRequestException(`Không thể lấy kết quả kiểm kê tạm thời: ${error.message}`);
    }
  }


  /**
   * Xóa kết quả kiểm kê tạm thời từ Redis
   */
  async deleteTempInventoryResults(roomId: string): Promise<boolean> {
    const redisKey = `temp_inventory:${roomId}`;

    try {
      return await this.redisService.del(redisKey);
    } catch (error) {
      throw new BadRequestException(`Không thể xóa kết quả kiểm kê tạm thời: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả kết quả kiểm kê tạm thời
   */
  async getAllTempInventoryResults(): Promise<TempInventoryResponseDto[]> {
    try {
      const keys = await this.redisService.keys('temp_inventory:*');
      const results: TempInventoryResponseDto[] = [];

      for (const key of keys) {
        const tempData = await this.redisService.get<TempInventoryResponseDto>(key);
        if (tempData) {
          const currentTtl = await this.redisService.ttl(key);
          results.push({
            ...tempData,
            ttl: currentTtl,
          });
        }
      }

      return results;
    } catch (error) {
      throw new BadRequestException(`Không thể lấy danh sách kết quả kiểm kê tạm thời: ${error.message}`);
    }
  }



  /**
   * Lưu kết quả kiểm kê tạm thời hàng xóm vào Redis
   */
  async saveTempAdjacentInventoryResults(
    saveTempAdjacentDto: SaveTempAdjacentInventoryDto
  ): Promise<TempAdjacentInventoryResponseDto> {
    const { roomResults, note, ttlSeconds = 86400 } = saveTempAdjacentDto;

    const savedRooms: any[] = [];

    for (const roomResult of roomResults) {
      const { roomId, result } = roomResult;
      
      // Tạo key cho Redis
      const redisKey = `temp_adjacent:${roomId}`;

      // Tính toán thống kê cho phòng này
      const stats = this.calculateAdjacentInventoryStats(result);

      // Tạo dữ liệu để lưu
      const tempData = {
        roomId,
        result,
        note,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        totalAssets: result.length,
        ...stats,
      };

      try {
        // Lưu vào Redis với TTL
        await this.redisService.set(redisKey, tempData, ttlSeconds);

        // Lấy TTL hiện tại
        const currentTtl = await this.redisService.ttl(redisKey);

        savedRooms.push({
          ...tempData,
          ttl: currentTtl,
        });
      } catch (error) {
        throw new BadRequestException(`Không thể lưu kết quả kiểm kê tạm thời cho phòng ${roomId}: ${error.message}`);
      }
    }

    // Tính tổng thống kê
    const totalStats = savedRooms.reduce((total, room) => ({
      totalRooms: (total.totalRooms || 0) + 1,
      totalAssets: (total.totalAssets || 0) + room.totalAssets,
      matchedAssets: (total.matchedAssets || 0) + room.matchedAssets,
      missingAssets: (total.missingAssets || 0) + room.missingAssets,
      excessAssets: (total.excessAssets || 0) + room.excessAssets,
      brokenAssets: (total.brokenAssets || 0) + room.brokenAssets,
      needsRepairAssets: (total.needsRepairAssets || 0) + room.needsRepairAssets,
      liquidationProposedAssets: (total.liquidationProposedAssets || 0) + room.liquidationProposedAssets,
    }), {});

    return {
      roomResults: savedRooms,
      note,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      ...totalStats,
    };
  }

  /**
   * Tính toán thống kê từ kết quả kiểm kê hàng xóm
   */
  private calculateAdjacentInventoryStats(results: any[]) {
    const stats = {
      matchedAssets: 0,
      missingAssets: 0,
      excessAssets: 0,
      brokenAssets: 0,
      needsRepairAssets: 0,
      liquidationProposedAssets: 0,
    };

    results.forEach((result) => {
      switch (result.status) {
        case 'MATCHED':
          stats.matchedAssets += result.countedQuantity;
          break;
        case 'MISSING':
          stats.missingAssets += result.countedQuantity;
          break;
        case 'EXCESS':
          stats.excessAssets += result.countedQuantity;
          break;
        case 'BROKEN':
          stats.brokenAssets += result.countedQuantity;
          break;
        case 'NEEDS_REPAIR':
          stats.needsRepairAssets += result.countedQuantity;
          break;
        case 'LIQUIDATION_PROPOSED':
          stats.liquidationProposedAssets += result.countedQuantity;
          break;
      }
    });

    return stats;
  }

  /**
   * Lấy kết quả kiểm kê tạm thời hàng xóm từ Redis theo roomId
   */
  async getTempInventoryAdjacentResults(roomId: string): Promise<TempAdjacentInventoryResponseDto | null> {
    const redisKey = `temp_adjacent:${roomId}`;

    try {
      const tempData = await this.redisService.get<TempAdjacentInventoryResponseDto>(redisKey);
      
      if (!tempData) {
        return null;
      }

      // Lấy TTL hiện tại
      const currentTtl = await this.redisService.ttl(redisKey);

      return {
        ...tempData,
        ttl: currentTtl,
      };
    } catch (error) {
      throw new BadRequestException(`Không thể lấy kết quả kiểm kê tạm thời: ${error.message}`);
    }
  }

  /**
   * Xóa kết quả kiểm kê tạm thời hàng xóm từ Redis
   */
  async deleteTempAdjacentInventoryResults(roomId: string): Promise<boolean> {
    const redisKey = `temp_adjacent:${roomId}`;

    try {
      return await this.redisService.del(redisKey);
    } catch (error) {
      throw new BadRequestException(`Không thể xóa kết quả kiểm kê tạm thời hàng xóm: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả kết quả kiểm kê tạm thời hàng xóm
   */
  async getAllTempAdjacentInventoryResults(): Promise<TempAdjacentInventoryResponseDto[]> {
    try {
      const keys = await this.redisService.keys('temp_adjacent:*');
      const results: TempAdjacentInventoryResponseDto[] = [];

      for (const key of keys) {
        const tempData = await this.redisService.get<TempAdjacentInventoryResponseDto>(key);
        if (tempData) {
          const currentTtl = await this.redisService.ttl(key);
          results.push({
            ...tempData,
            ttl: currentTtl,
          });
        }
      }

      return results;
    } catch (error) {
      throw new BadRequestException(`Không thể lấy danh sách kết quả kiểm kê tạm thời hàng xóm: ${error.message}`);
    }
  }

  // === INVENTORY RESULT SUBMISSION METHODS ===

  /**
   * Submit kết quả kiểm kê chính thức
   */
  async submitInventoryResult(
    submitDto: SubmitInventoryResultDto,
    currentUser: User
  ): Promise<SubmitInventoryResultResponseDto> {
    try {
      const { assignmentId, results, note } = submitDto;

    // Kiểm tra assignment có tồn tại không
    const assignment = await this.inventoryGroupAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['group', 'unit'],
    });

    if (!assignment) {
      throw new NotFoundException(`Phân công kiểm kê với ID ${assignmentId} không tồn tại`);
    }

    // Validation: Kiểm tra tất cả assets có tồn tại không
    const assetIds = results.map(result => result.assetId);
    const assets = await this.assetRepository.findBy({ id: In(assetIds) });
    
    if (assets.length !== assetIds.length) {
      const foundAssetIds = assets.map(asset => asset.id);
      const missingAssetIds = assetIds.filter(id => !foundAssetIds.includes(id));
      throw new BadRequestException(`Một hoặc nhiều tài sản không tồn tại: ${missingAssetIds.join(', ')}`);
    }

    // Validation: Kiểm tra assets có thuộc về room được phân công không
    // Lấy danh sách rooms thuộc về unit được phân công
    const rooms = await this.unitRepository.findOne({
      where: { id: assignment.unitId },
      relations: ['rooms']
    });

    if (!rooms || !rooms.rooms || rooms.rooms.length === 0) {
      throw new BadRequestException('Đơn vị được phân công không có phòng nào');
    }

    const roomIds = rooms.rooms.map(room => room.id);
    const assetRoomIds = assets.map(asset => asset.currentRoomId);
    const invalidRoomIds = assetRoomIds.filter(roomId => !roomIds.includes(roomId));
    
    if (invalidRoomIds.length > 0) {
      throw new BadRequestException(`Một hoặc nhiều tài sản không thuộc về phòng được phân công: ${invalidRoomIds.join(', ')}`);
    }

    // Tạo map asset để lấy systemQuantity
    const assetMap = new Map(assets.map(asset => [asset.id, asset]));

    // Tạo inventory results
    const savedResults: InventoryResult[] = [];

    for (const result of results) {
      const asset = assetMap.get(result.assetId);
      if (!asset) continue;

      // Tạo inventory result
      const inventoryResult = this.inventoryResultRepository.create({
        assetId: result.assetId,
        assignmentId: assignmentId,
        systemQuantity: asset.quantity, // Lấy từ asset entity
        countedQuantity: result.countedQuantity,
        scanMethod: result.scanMethod,
        status: result.status,
        note: result.note || '',
        createdBy: currentUser.id,
        roomId: result.roomId,
      });

      // Lưu inventory result trước
      const savedResult = await this.inventoryResultRepository.save(inventoryResult);

      // Tạo và lưu file URLs nếu có
      if (result.imageUrls && result.imageUrls.length > 0) {
        const resultFileUrls = result.imageUrls.map(url => 
          this.fileUrlRepository.create({ url })
        );
        const savedFileUrls = await this.fileUrlRepository.save(resultFileUrls);
        
        // Tạo relation
        savedResult.fileUrls = savedFileUrls;
        await this.inventoryResultRepository.save(savedResult);
      }

      savedResults.push(savedResult);
    }

    // Tính toán thống kê
    const statistics = this.calculateInventoryResultStats(savedResults);

    // Tạo response
    const response: SubmitInventoryResultResponseDto = {
      assignmentId,
      results: savedResults.map(result => ({
        id: result.id,
        assetId: result.assetId,
        systemQuantity: result.systemQuantity,
        countedQuantity: result.countedQuantity,
        scanMethod: result.scanMethod,
        status: result.status,
        note: result.note,
        imageUrls: result.fileUrls?.map(f => f.url) || [],
        createdBy: result.createdBy,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        roomId: result.roomId,
      })),
      note: note || '',
      totalResults: savedResults.length,
      statistics,
      submittedAt: new Date(),
    };

    return response;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`Không thể submit kết quả kiểm kê: ${error.message}`);
    }
  }

  /**
   * Tính toán thống kê từ kết quả kiểm kê đã lưu
   */
  private calculateInventoryResultStats(results: InventoryResult[]) {
    const stats = {
      totalAssets: 0,
      matchedAssets: 0,
      missingAssets: 0,
      excessAssets: 0,
      brokenAssets: 0,
      needsRepairAssets: 0,
      liquidationProposedAssets: 0,
    };

    results.forEach(result => {
      stats.totalAssets += result.countedQuantity;
      
      switch (result.status) {
        case 'MATCHED':
          stats.matchedAssets += result.countedQuantity;
          break;
        case 'MISSING':
          stats.missingAssets += result.countedQuantity;
          break;
        case 'EXCESS':
          stats.excessAssets += result.countedQuantity;
          break;
        case 'BROKEN':
          stats.brokenAssets += result.countedQuantity;
          break;
        case 'NEEDS_REPAIR':
          stats.needsRepairAssets += result.countedQuantity;
          break;
        case 'LIQUIDATION_PROPOSED':
          stats.liquidationProposedAssets += result.countedQuantity;
          break;
      }
    });

    return stats;
  }

  // === ROOM INVENTORY STATUS METHODS ===

  async getRoomsInventoryStatus(assignmentId: string) {
    // Lấy tất cả roomId có kết quả kiểm kê trong phân công này
    const results = await this.inventoryResultRepository
      .createQueryBuilder('result')
      .leftJoin('result.asset', 'asset')
      .select('DISTINCT result.roomId as roomId')
      .where('result.assignmentId = :assignmentId', { assignmentId })
      .andWhere('result.roomId IS NOT NULL')
      .getRawMany();

    // Tạo Map để dễ tra cứu
    const roomStatusMap = new Map<string, boolean>();
    results.forEach(result => {
      // Query trả về roomid (chữ thường), không phải roomId
      if (result.roomid) {
        roomStatusMap.set(result.roomid, true);
      }
    });

    // Trả về array với roomId và status
    return Array.from(roomStatusMap.entries()).map(([roomId, status]) => ({
      roomId,
      status
    }));
  }

  async getRoomInventoryResults(roomId: string, assignmentId: string) {
    // Lấy kết quả kiểm kê đã submit cho phòng này
    const results = await this.inventoryResultRepository.find({
      where: { 
        roomId: roomId
      },
      relations: ['asset', 'assignment', 'fileUrls']
    });

    console.log('Raw results from database:', JSON.stringify(results, null, 2));

    // Chuyển đổi sang format TempInventoryResponseDto
    const mappedResults = results.map(result => {
      console.log(`Result ${result.id} fileUrls:`, result.fileUrls);
      return {
        id: result.id,
        assignmentId: result.assignmentId,
        assetId: result.assetId,
        systemQuantity: result.systemQuantity,
        countedQuantity: result.countedQuantity,
        scanMethod: result.scanMethod,
        status: result.status,
        imageUrls: result.fileUrls?.map(file => file.url) || [],
        note: result.note,
        createdAt: result.createdAt,
        asset: result.asset,
        roomId: result.roomId,
        isSubmitted: true
      };
    });

    console.log('Mapped results:', JSON.stringify(mappedResults, null, 2));
    return mappedResults;
  }

}
