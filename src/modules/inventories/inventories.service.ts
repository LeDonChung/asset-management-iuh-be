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
import { Room } from "src/entities/room.entity";
import { RedisService } from "../redis/redis.service";
import { InventorySub } from "src/entities/inventory-sub.entity";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { AssetBook } from "src/entities/asset-book.entity";
import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import { InventoryResultStatus } from "src/common/shared/InventoryResultStatus";
import { SaveTempInventoryDto, AssetInventoryDetail } from "./dto/save-temp-inventory.dto";
import { TempInventoryResponseDto } from "./dto/temp-inventory-response.dto";
import { SubmitInventoryResultDto } from "./dto/submit-inventory-result.dto";
import { SubmitInventoryResultResponseDto } from "./dto/submit-inventory-result-response.dto";
import { UpdateInventoryResultDto } from "./dto/update-inventory-result.dto";
import { InventoryStatisticsFilterDto, StatisticsLevel } from "./dto/inventory-statistics-filter.dto";
import { 
  InventoryStatisticsResponseDto, 
  StatusStatisticsDto, 
  AssetTypeStatisticsDto, 
  ScanMethodStatisticsDto,
  LevelStatisticsItemDto 
} from "./dto/inventory-statistics-response.dto";
import { SaveTempAdjacentInventoryDto } from "./dto/save-temp-adjacent-inventory.dto";
import { TempAdjacentInventoryResponseDto } from "./dto/temp-adjacent-inventory-response.dto";
import { RoomInventoryResultResponseDto } from "./dto/room-inventory-result-response.dto";
import { InventoryResultResponseDto } from "./dto/inventory-result-response.dto";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { CopyInventoryDto } from "./dto/copy-inventory.dto";
import { CopyInventoryResponseDto } from "./dto/copy-inventory-response.dto";
import { UnitType } from "src/common/shared/UnitType";
import { MultiRoomInventoryFilterDto } from "./dto/multi-room-inventory-filter.dto";
import { MultiRoomInventoryResponseDto, RoomInventorySimpleDto, AssetInventorySimpleDto } from "./dto/multi-room-inventory-response.dto";
import { ExportInventoryExcelDto, ExportMultiRoomInventoryExcelDto } from "./dto/export-inventory-excel.dto";
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

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
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(InventorySub)
    private inventorySubRepository: Repository<InventorySub>,
    @InjectRepository(AssetBookItem)
    private assetBookItemRepository: Repository<AssetBookItem>,
    @InjectRepository(AssetBook)
    private assetBookRepository: Repository<AssetBook>,
    private redisService: RedisService
  ) {}

  /**
   * Tự động tạo tiểu ban kiểm kê cho các units
   */
  private async createInventorySubsForUnits(
    inventorySessionUnits: InventorySessionUnit[],
    currentUser: User
  ): Promise<void> {
    for (const sessionUnit of inventorySessionUnits) {
      // Lấy thông tin unit để có tên
      const unit = await this.unitRepository.findOne({
        where: { id: sessionUnit.unitId }
      });

      if (unit) {
        // Tạo tiểu ban kiểm kê với tên dựa trên tên unit
        const inventorySub = this.inventorySubRepository.create({
          name: `Tiểu ban kiểm kê ${unit.name}`,
          inventorySessionUnitId: sessionUnit.id,
          description: `Tiểu ban kiểm kê tự động tạo cho ${unit.name}`,
          createdBy: currentUser.id,
        });

        await this.inventorySubRepository.save(inventorySub);
      }
    }
  }

  /**
   * Xóa tiểu ban kiểm kê cho các units
   */
  private async deleteInventorySubsForUnits(
    inventorySessionUnits: InventorySessionUnit[]
  ): Promise<void> {
    for (const sessionUnit of inventorySessionUnits) {
      // Tìm và xóa tiểu ban kiểm kê liên quan
      const inventorySub = await this.inventorySubRepository.findOne({
        where: { inventorySessionUnitId: sessionUnit.id }
      });

      if (inventorySub) {
        await this.inventorySubRepository.softDelete(inventorySub.id);
      }
    }
  }

  async create(
    createInventoryDto: CreateInventoryDto,
    currentUser?: User
  ): Promise<InventorySessionResponseDto> {
    const { fileUrls, ...inventoryData } = createInventoryDto;

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

    // Validation: Kiểm tra đã có kỳ kiểm kê nào trong năm này chưa (mỗi năm chỉ có 1 kỳ)
    const existingSession = await this.inventorySessionRepository.findOne({
      where: {
        year: inventoryData.year
      }
    });

    if (existingSession) {
      throw new BadRequestException(
        `Năm ${inventoryData.year} đã có kỳ kiểm kê "${existingSession.name}". Mỗi năm chỉ được tạo một kỳ kiểm kê duy nhất.`
      );
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

    // Tự động tạo inventory session units cho tất cả units
    const allUnits = await this.unitRepository.find({
      where: { status: UnitStatus.ACTIVE, type: UnitType.CAMPUS }
    });
    
    if (allUnits.length > 0) {
      const inventorySessionUnits = allUnits.map((unit) =>
        this.inventorySessionUnitRepository.create({
          sessionId: savedSession.id,
          unitId: unit.id,
        })
      );
      const savedInventorySessionUnits = await this.inventorySessionUnitRepository.save(inventorySessionUnits);

      // Tự động tạo tiểu ban kiểm kê cho mỗi unit
      await this.createInventorySubsForUnits(savedInventorySessionUnits, currentUser);
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
          status: FieldType.SELECT,
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
    const { fileUrls, ...updateData } = updateInventoryDto;

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

    // Validation: Kiểm tra năm có thay đổi không (nếu có cập nhật năm)
    if (updateData.year && updateData.year !== existingSession.year) {
      const existingSessionInNewYear =
        await this.inventorySessionRepository.findOne({
          where: {
            year: updateData.year,
          },
        });

      if (existingSessionInNewYear && existingSessionInNewYear.id !== id) {
        throw new BadRequestException(
          `Năm ${updateData.year} đã có kỳ kiểm kê "${existingSessionInNewYear.name}". Mỗi năm chỉ được có một kỳ kiểm kê duy nhất.`
        );
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
      
    // Xử lý units - cập nhật để đồng bộ với tất cả units active hiện tại
    const allActiveUnits = await this.unitRepository.find({
      where: { status: UnitStatus.ACTIVE }
    });
    
    const currentUnitIds = existingSession.inventorySessionUnits?.map(isu => isu.unitId) || [];
    const activeUnitIds = allActiveUnits.map(unit => unit.id);
    
    // Chỉ cập nhật nếu có sự thay đổi trong danh sách units
    const unitsChanged = currentUnitIds.length !== activeUnitIds.length || 
                        !currentUnitIds.every(id => activeUnitIds.includes(id));
    
    if (unitsChanged) {
      // Xóa các inventory subs trước (để tránh foreign key constraint)
      if (existingSession.inventorySessionUnits && existingSession.inventorySessionUnits.length > 0) {
        await this.deleteInventorySubsForUnits(existingSession.inventorySessionUnits);
      }
      
      // Xóa các inventory session units cũ
      if (existingSession.inventorySessionUnits && existingSession.inventorySessionUnits.length > 0) {
        await this.inventorySessionUnitRepository.remove(existingSession.inventorySessionUnits);
      }

      // Tạo inventory session units mới cho tất cả units active
      if (allActiveUnits.length > 0) {
        const inventorySessionUnits = allActiveUnits.map((unit) =>
          this.inventorySessionUnitRepository.create({
            inventorySession: existingSession,
            unitId: unit.id,
          })
        );
        const savedInventorySessionUnits = await this.inventorySessionUnitRepository.save(inventorySessionUnits);
        
        // Tự động tạo lại tiểu ban kiểm kê cho mỗi unit
        const currentUser = { id: existingSession.createdBy } as User;
        await this.createInventorySubsForUnits(savedInventorySessionUnits, currentUser);
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
    // Kiểm tra session có tồn tại không
    const session = await this.inventorySessionRepository.findOne({
      where: { id }
    });

    if (!session) {
      throw new NotFoundException('Kỳ kiểm kê không tồn tại');
    }

    // Chỉ cho phép xóa khi ở trạng thái PLANNED
    if (session.status !== InventorySessionStatus.PLANNED) {
      throw new BadRequestException('Chỉ có thể xóa kỳ kiểm kê ở trạng thái Kế hoạch');
    }

    await this.inventorySessionRepository.softDelete(id);
  }

  /**
   * Sao chép kỳ kiểm kê từ kỳ có sẵn
   */
  async copyInventorySession(
    sourceSessionId: string,
    copyInventoryDto: CopyInventoryDto,
    currentUser: User
  ): Promise<CopyInventoryResponseDto> {
    const {
      name,
      year,
      startDate,
      endDate,
      description,
      copyMembers = false,
      copyGroups = false,
      copyAssignments = false,
      copyFileUrls = false,
      copySubInventories = true
    } = copyInventoryDto;

    // Validation: Kiểm tra source session có tồn tại không
    const sourceSession = await this.inventorySessionRepository.findOne({
      where: { id: sourceSessionId },
      relations: [
        'fileUrls',
        'members',
        'inventorySessionUnits',
        'inventorySessionUnits.subInventory',
        'inventorySessionUnits.subInventory.members',
        'inventorySessionUnits.subInventory.groups',
        'inventorySessionUnits.subInventory.groups.members',
        'inventorySessionUnits.subInventory.groups.assignments'
      ]
    });

    if (!sourceSession) {
      throw new NotFoundException(`Kỳ kiểm kê nguồn với ID ${sourceSessionId} không tồn tại`);
    }

    // Validation: Kiểm tra ngày bắt đầu và kết thúc
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj >= endDateObj) {
      throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
    }

    if (startDateObj < new Date()) {
      throw new BadRequestException("Ngày bắt đầu không được nhỏ hơn ngày hiện tại");
    }

    // Validation: Kiểm tra năm đích đã có kỳ kiểm kê chưa
    const existingSessionInYear = await this.inventorySessionRepository.findOne({
      where: { year }
    });

    if (existingSessionInYear) {
      throw new BadRequestException(
        `Năm ${year} đã có kỳ kiểm kê "${existingSessionInYear.name}". Mỗi năm chỉ được tạo một kỳ kiểm kê duy nhất.`
      );
    }

    // Tạo inventory session mới
    const newSession = this.inventorySessionRepository.create({
      name,
      year,
      startDate: startDateObj,
      endDate: endDateObj,
      status: InventorySessionStatus.PLANNED,
      createdBy: currentUser.id,
    });

    // Copy file URLs nếu được yêu cầu
    if (copyFileUrls && sourceSession.fileUrls && sourceSession.fileUrls.length > 0) {
      const newFileUrls = sourceSession.fileUrls.map(fileUrl =>
        this.fileUrlRepository.create({ url: fileUrl.url })
      );
      newSession.fileUrls = newFileUrls;
    }

    // Lưu session mới
    const savedSession = await this.inventorySessionRepository.save(newSession);

    // Tự động tạo inventory session units cho tất cả units active
    const allActiveUnits = await this.unitRepository.find({
      where: { status: UnitStatus.ACTIVE, type: UnitType.CAMPUS }
    });

    let inventorySessionUnits: any[] = [];
    if (allActiveUnits.length > 0) {
      inventorySessionUnits = allActiveUnits.map((unit) =>
        this.inventorySessionUnitRepository.create({
          sessionId: savedSession.id,
          unitId: unit.id,
        })
      );
      const savedInventorySessionUnits = await this.inventorySessionUnitRepository.save(inventorySessionUnits);
      inventorySessionUnits = savedInventorySessionUnits;
    }

    // Khởi tạo counters cho kết quả copy
    const copyResults = {
      membersCopied: 0,
      groupsCopied: 0,
      assignmentsCopied: 0,
      fileUrlsCopied: copyFileUrls && sourceSession.fileUrls ? sourceSession.fileUrls.length : 0,
      subInventoriesCopied: 0
    };

    // Copy members nếu được yêu cầu
    if (copyMembers && sourceSession.members && sourceSession.members.length > 0) {
      const newMembers = sourceSession.members.map(member =>
        this.inventorySessionMemberRepository.create({
          inventorySessionId: savedSession.id,
          userId: member.userId,
          role: member.role,
          createdBy: currentUser.id,
        })
      );
      const savedMembers = await this.inventorySessionMemberRepository.save(newMembers);
      copyResults.membersCopied = newMembers.length;
    }

    // Copy sub inventories và các thành phần liên quan
    if (copySubInventories && sourceSession.inventorySessionUnits) {
      for (const sourceSessionUnit of sourceSession.inventorySessionUnits) {
        // Tìm session unit tương ứng trong session mới
        const newSessionUnit = inventorySessionUnits.find(isu => isu.unitId === sourceSessionUnit.unitId);
        if (!newSessionUnit) continue;

        if (sourceSessionUnit.subInventory) {
          // Tạo sub inventory mới
          const newSubInventory = this.inventorySubRepository.create({
            name: sourceSessionUnit.subInventory.name,
            inventorySessionUnitId: newSessionUnit.id,
            description: sourceSessionUnit.subInventory.description,
            createdBy: currentUser.id,
          });
          const savedSubInventory = await this.inventorySubRepository.save(newSubInventory);
          copyResults.subInventoriesCopied++;

          // Copy sub inventory members nếu có
          if (sourceSessionUnit.subInventory.members && sourceSessionUnit.subInventory.members.length > 0) {
            // Note: Sub inventory members copy would need SubInventoryMember repository
            // This is commented out as we need to implement SubInventoryMember entity properly
          }

          // Copy groups nếu được yêu cầu
          if (copyGroups && sourceSessionUnit.subInventory.groups && sourceSessionUnit.subInventory.groups.length > 0) {
            for (const sourceGroup of sourceSessionUnit.subInventory.groups) {
              const newGroup = this.inventoryGroupRepository.create({
                name: sourceGroup.name,
                subInventoryId: savedSubInventory.id,
                description: sourceGroup.description,
                status: sourceGroup.status,
                createdBy: currentUser.id,
              });
              const savedGroup = await this.inventoryGroupRepository.save(newGroup);
              copyResults.groupsCopied++;

              // Copy group members nếu có
              if (sourceGroup.members && sourceGroup.members.length > 0) {
                const newGroupMembers = sourceGroup.members.map(member =>
                  this.inventoryGroupMemberRepository.create({
                    groupId: savedGroup.id,
                    userId: member.userId,
                    role: member.role,
                    createdBy: currentUser.id,
                  })
                );
                await this.inventoryGroupMemberRepository.save(newGroupMembers);
              }

              // Copy assignments nếu được yêu cầu
              if (copyAssignments && sourceGroup.assignments && sourceGroup.assignments.length > 0) {
                const newAssignments = sourceGroup.assignments.map(assignment =>
                  this.inventoryGroupAssignmentRepository.create({
                    groupId: savedGroup.id,
                    unitId: assignment.unitId,
                    startDate: startDateObj, // Sử dụng startDate từ session mới
                    endDate: endDateObj, // Sử dụng endDate từ session mới
                    note: assignment.note,
                    createdBy: currentUser.id,
                  })
                );
                await this.inventoryGroupAssignmentRepository.save(newAssignments);
                copyResults.assignmentsCopied += newAssignments.length;
              }
            }
          }
        }
      }
    } else {
      // Nếu không copy sub inventories, tự động tạo sub inventories mới
      await this.createInventorySubsForUnits(inventorySessionUnits, currentUser);
      copyResults.subInventoriesCopied = inventorySessionUnits.length;
    }

    // Lấy thông tin session mới đã tạo
    const newInventorySession = await this.findOne(savedSession.id);

    return plainToInstance(CopyInventoryResponseDto, {
      newInventorySession,
      sourceInventorySessionId: sourceSessionId,
      copyOptions: {
        copyMembers,
        copyGroups,
        copyAssignments,
        copyFileUrls,
        copySubInventories
      },
      copyResults,
      copiedAt: new Date()
    }, {
      excludeExtraneousValues: true,
    });
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

    // Kiểm tra assignment có tồn tại không và lấy thông tin inventory session
    const assignment = await this.inventoryGroupAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['group', 'group.subInventory', 'group.subInventory.inventorySessionUnit', 'group.subInventory.inventorySessionUnit.inventorySession', 'unit'],
    });

    if (!assignment) {
      throw new NotFoundException(`Phân công kiểm kê với ID ${assignmentId} không tồn tại`);
    }

    // Lấy year từ inventory session
    const inventorySession = assignment.group?.subInventory?.inventorySessionUnit?.inventorySession;
    if (!inventorySession) {
      throw new NotFoundException('Không tìm thấy thông tin kỳ kiểm kê');
    }
    const year = inventorySession.year;

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
    const resultRoomIds = results.map(result => result.roomId);
    const invalidRoomIds = resultRoomIds.filter(roomId => !roomIds.includes(roomId));
    
    if (invalidRoomIds.length > 0) {
      const invalidAssetIds = results
        .filter(result => invalidRoomIds.includes(result.roomId))
        .map(result => result.assetId);
      throw new BadRequestException(`Một hoặc nhiều tài sản không thuộc về phòng được phân công: ${[...new Set(invalidAssetIds)].join(', ')}`);
    }

    const assetBook = await this.assetBookRepository.findOne({
      where: {
        unitId: assignment.unitId,
        year: year,
        status: AssetBookStatus.OPEN,
      },
    });

    if (!assetBook) {
      throw new NotFoundException(`Không tìm thấy sổ tài sản cho đơn vị ${assignment.unitId} năm ${year}`);
    }

    const uniqueAssetRoomPairs = [...new Set(results.map(r => `${r.assetId}:${r.roomId}`))];
    const assetBookItems = await this.assetBookItemRepository.find({
      where: {
        bookId: assetBook.id,
        assetId: In(results.map(r => r.assetId)),
        roomId: In(results.map(r => r.roomId)),
        status: AssetBookItemStatus.IN_USE,
      },
    });

    const assetBookItemMap = new Map<string, number>();
    assetBookItems.forEach(item => {
      const key = `${item.assetId}:${item.roomId}`;
      const existingQuantity = assetBookItemMap.get(key) || 0;
      assetBookItemMap.set(key, existingQuantity + item.quantity);
    });

    const assetMap = new Map(assets.map(asset => [asset.id, asset]));

    const savedResults: InventoryResult[] = [];

    for (const result of results) {
      const asset = assetMap.get(result.assetId);
      if (!asset) continue;

      const bookItemKey = `${result.assetId}:${result.roomId}`;
      const systemQuantity = assetBookItemMap.get(bookItemKey) || 0;

      const finalSystemQuantity = systemQuantity > 0 ? systemQuantity : asset.quantity;

      let finalStatus: InventoryResultStatus = result.status as InventoryResultStatus;
      const specialStatuses = [InventoryResultStatus.BROKEN, InventoryResultStatus.NEEDS_REPAIR, InventoryResultStatus.LIQUIDATION_PROPOSED];
      if (!specialStatuses.includes(result.status as InventoryResultStatus)) {
        if (result.countedQuantity === finalSystemQuantity) {
          finalStatus = InventoryResultStatus.MATCHED;
        } else if (result.countedQuantity > finalSystemQuantity) {
          finalStatus = InventoryResultStatus.EXCESS;
        } else if (result.countedQuantity < finalSystemQuantity) {
          finalStatus = InventoryResultStatus.MISSING;
        }
      }

      // Tạo inventory result
      const inventoryResult = this.inventoryResultRepository.create({
        assetId: result.assetId,
        assignmentId: assignmentId,
        systemQuantity: finalSystemQuantity,
        countedQuantity: result.countedQuantity,
        scanMethod: result.scanMethod,
        status: finalStatus,
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

  async getRoomInventoryResults(roomId: string): Promise<RoomInventoryResultResponseDto> {
    // Lấy kết quả kiểm kê đã submit cho phòng này
    const results = await this.inventoryResultRepository.find({
      where: { 
        roomId: roomId
      },
      relations: ['asset', 'asset.rfidTag', 'assignment', 'fileUrls', 'room']
    });


    // Chuyển đổi sang DTO
    const inventoryResultDtos = plainToInstance(InventoryResultResponseDto, results, {
      excludeExtraneousValues: true,
    });

    // Phân loại theo loại tài sản
    const fixedAssets = inventoryResultDtos.filter(result => 
      result.asset?.type === 'FIXED_ASSET'
    );
    
    const toolsEquipment = inventoryResultDtos.filter(result => 
      result.asset?.type === 'TOOLS_EQUIPMENT'
    );

    // Tính thống kê
    const calculateStats = (items: InventoryResultResponseDto[]) => {
      return items.reduce((stats, item) => {
        stats.totalAssets += item.countedQuantity;
        
        switch (item.status) {
          case 'MATCHED':
            stats.matchedAssets += item.countedQuantity;
            break;
          case 'MISSING':
            stats.missingAssets += item.countedQuantity;
            break;
          case 'EXCESS':
            stats.excessAssets += item.countedQuantity;
            break;
          case 'BROKEN':
            stats.brokenAssets += item.countedQuantity;
            break;
          case 'NEEDS_REPAIR':
            stats.needsRepairAssets += item.countedQuantity;
            break;
          case 'LIQUIDATION_PROPOSED':
            stats.liquidationProposedAssets += item.countedQuantity;
            break;
        }
        
        return stats;
      }, {
        totalAssets: 0,
        matchedAssets: 0,
        missingAssets: 0,
        excessAssets: 0,
        brokenAssets: 0,
        needsRepairAssets: 0,
        liquidationProposedAssets: 0,
      });
    };

    const fixedAssetStats = calculateStats(fixedAssets);
    const toolsStats = calculateStats(toolsEquipment);

    const response: RoomInventoryResultResponseDto = {
      roomId,
      fixedAssets,
      toolsEquipment,
      summary: {
        totalAssets: fixedAssets.length + toolsEquipment.length,
        totalFixedAssets: fixedAssets.length,
        totalToolsEquipment: toolsEquipment.length,
        matchedAssets: fixedAssetStats.matchedAssets + toolsStats.matchedAssets,
        missingAssets: fixedAssetStats.missingAssets + toolsStats.missingAssets,
        excessAssets: fixedAssetStats.excessAssets + toolsStats.excessAssets,
        brokenAssets: fixedAssetStats.brokenAssets + toolsStats.brokenAssets,
        needsRepairAssets: fixedAssetStats.needsRepairAssets + toolsStats.needsRepairAssets,
        liquidationProposedAssets: fixedAssetStats.liquidationProposedAssets + toolsStats.liquidationProposedAssets,
      }
    };

    return plainToInstance(RoomInventoryResultResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cập nhật số lượng kết quả kiểm kê
   */
  async updateInventoryResult(
    id: string,
    updateDto: UpdateInventoryResultDto,
    currentUser: User
  ): Promise<InventoryResultResponseDto> {
    // Tìm kết quả kiểm kê
    const result = await this.inventoryResultRepository.findOne({
      where: { id },
      relations: ['asset', 'asset.rfidTag', 'assignment', 'fileUrls', 'room']
    });

    if (!result) {
      throw new NotFoundException(`Không tìm thấy kết quả kiểm kê với ID: ${id}`);
    }

    // Cập nhật số lượng
    result.countedQuantity = updateDto.countedQuantity;

    // Tính lại trạng thái dựa trên số lượng
    const specialStatuses = [
      InventoryResultStatus.BROKEN,
      InventoryResultStatus.NEEDS_REPAIR,
      InventoryResultStatus.LIQUIDATION_PROPOSED
    ];

    // Chỉ tự động tính lại trạng thái nếu không phải là trạng thái đặc biệt
    if (!specialStatuses.includes(result.status)) {
      if (result.countedQuantity === result.systemQuantity) {
        result.status = InventoryResultStatus.MATCHED;
      } else if (result.countedQuantity > result.systemQuantity) {
        result.status = InventoryResultStatus.EXCESS;
      } else if (result.countedQuantity < result.systemQuantity) {
        result.status = InventoryResultStatus.MISSING;
      }
    }

    // Lưu kết quả
    const updatedResult = await this.inventoryResultRepository.save(result);

    // Chuyển đổi sang DTO
    return plainToInstance(InventoryResultResponseDto, updatedResult, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Lấy kết quả kiểm kê nhiều phòng với pagination
   */
  async getMultiRoomInventoryResults(
    filterDto: MultiRoomInventoryFilterDto
  ): Promise<MultiRoomInventoryResponseDto> {
    const { page = 1, limit = 5, assignmentId, sessionId, unitId, search, assetType } = filterDto;
    const offset = (page - 1) * limit;

    // Tạo query builder cơ bản
    let query = this.inventoryResultRepository
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.asset', 'asset')
      .leftJoinAndSelect('result.room', 'room')
      .leftJoinAndSelect('result.assignment', 'assignment')
      .leftJoinAndSelect('assignment.group', 'group')
      .leftJoinAndSelect('group.subInventory', 'subInventory')
      .leftJoinAndSelect('subInventory.inventorySessionUnit', 'sessionUnit')
      .leftJoinAndSelect('sessionUnit.inventorySession', 'session')
      .where('result.roomId IS NOT NULL')
      .andWhere('result.deletedAt IS NULL')
      .andWhere('asset.deletedAt IS NULL')
      .andWhere('room.deletedAt IS NULL');

    // Áp dụng filter theo assignmentId
    if (assignmentId) {
      query = query.andWhere('result.assignmentId = :assignmentId', { assignmentId });
    }

    // Áp dụng filter theo sessionId
    if (sessionId) {
      query = query.andWhere('session.id = :sessionId', { sessionId });
    }

    // Áp dụng filter theo unitId
    if (unitId) {
      query = query.andWhere('assignment.unitId = :unitId', { unitId });
    }

    // Áp dụng tìm kiếm theo tên phòng
    if (search && search.trim()) {
      query = query.andWhere('room.name ILIKE :search', { search: `%${search.trim()}%` });
    }

    // Áp dụng filter theo loại tài sản
    if (assetType && assetType !== 'ALL') {
      query = query.andWhere('asset.type = :assetType', { assetType });
    }

    // Lấy danh sách kết quả
    const results = await query
      .orderBy('room.name', 'ASC')
      .addOrderBy('asset.fixedCode', 'ASC')
      .getMany();

    // Group theo roomId
    const roomResultsMap = new Map<string, any[]>();
    const roomInfoMap = new Map<string, any>();
    
    // Lấy thông tin chi tiết các phòng
    const roomIds = [...new Set(results.map(result => result.roomId))];
    if (roomIds.length > 0) {
      const rooms = await this.roomRepository.find({
        where: { id: In(roomIds) }
      });
      rooms.forEach(room => {
        roomInfoMap.set(room.id, room);
      });
    }
    
    results.forEach(result => {
      if (!roomResultsMap.has(result.roomId)) {
        roomResultsMap.set(result.roomId, []);
      }
      roomResultsMap.get(result.roomId)!.push(result);
    });

    // Tạo danh sách các phòng
    const roomsData: RoomInventorySimpleDto[] = [];
    
    for (const [roomId, roomResults] of roomResultsMap.entries()) {
      const roomInfo = roomInfoMap.get(roomId);

      // Phân loại tài sản theo type
      const fixedAssets: AssetInventorySimpleDto[] = [];
      const toolsEquipment: AssetInventorySimpleDto[] = [];

      roomResults.forEach(result => {
        const assetData: AssetInventorySimpleDto = {
          id: result.id,
          assetId: result.assetId,
          systemQuantity: result.systemQuantity,
          countedQuantity: result.countedQuantity,
          status: result.status,
          scanMethod: result.scanMethod,
          note: result.note || '',
          createdAt: result.createdAt,
          asset: {
            id: result.asset.id,
            name: result.asset.name || '',
            fixedCode: result.asset.fixedCode || '',
            ktCode: result.asset.ktCode || '',
            type: result.asset.type || '',
          }
        };

        if (result.asset.type === 'FIXED_ASSET') {
          fixedAssets.push(assetData);
        } else {
          toolsEquipment.push(assetData);
        }
      });

      roomsData.push({
        roomId,
        roomName: roomInfo?.name || `Phòng ${roomId.substring(0, 8)}`,
        fixedAssets,
        toolsEquipment,
      });
    }

    // Sort theo tên phòng
    roomsData.sort((a, b) => a.roomName.localeCompare(b.roomName));

    // Áp dụng pagination
    const totalRooms = roomsData.length;
    const totalPages = Math.ceil(totalRooms / limit);
    const paginatedRooms = roomsData.slice(offset, offset + limit);

    const response: MultiRoomInventoryResponseDto = {
      rooms: paginatedRooms,
      page,
      limit,
      totalRooms,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return plainToInstance(MultiRoomInventoryResponseDto, response, {
      excludeExtraneousValues: true,
    });
  }

  // === EXPORT EXCEL METHODS ===

  /**
   * Xuất kết quả kiểm kê của một phòng ra file Excel với format chuyên nghiệp
   */
  async exportRoomInventoryToExcel(
    exportDto: ExportInventoryExcelDto,
    currentUser: User
  ): Promise<Buffer> {
    // Lấy thông tin phòng
    const room = await this.roomRepository.findOne({
      where: { id: exportDto.roomId },
      relations: ['unit']
    });

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng với ID: ${exportDto.roomId}`);
    }

    // Lấy kết quả kiểm kê của phòng
    const roomResults = await this.getRoomInventoryResults(exportDto.roomId);

    // Tạo workbook với ExcelJS để có styling đẹp
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo kiểm kê tài sản');

    // Thiết lập width cho các cột
    worksheet.columns = [
      { width: 5 },   // STT
      { width: 35 },  // Tên tài sản
      { width: 15 },  // Mã tài sản
      { width: 15 },  // Loại tài sản
      { width: 12 },  // Số lượng hệ thống
      { width: 12 },  // Số lượng kiểm kê
      { width: 10 },  // Chênh lệch
      { width: 15 },  // Phương pháp quét
      { width: 12 },  // Trạng thái
      { width: 30 },  // Ghi chú
      { width: 12 },  // Ngày kiểm kê
    ];

    let currentRow = 1;

    // Tiêu đề báo cáo
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = `BÁO CÁO KIỂM KÊ TÀI SẢN PHÒNG ${room.roomCode || room.name}`;
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6F3FF' }
    };
    currentRow += 2;

    // Thông tin phòng và ngày
    const roomInfoCell = worksheet.getCell(`A${currentRow}`);
    roomInfoCell.value = `Phòng: ${room.roomCode || room.name} - Đơn vị: ${room.unit?.name || 'N/A'}`;
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    roomInfoCell.font = { bold: true, size: 12 };
    roomInfoCell.alignment = { horizontal: 'left' };
    currentRow++;

    const dateInfoCell = worksheet.getCell(`A${currentRow}`);
    dateInfoCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`;
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    dateInfoCell.font = { size: 11 };
    dateInfoCell.alignment = { horizontal: 'left' };
    currentRow++;

    const userInfoCell = worksheet.getCell(`A${currentRow}`);
    userInfoCell.value = `Người xuất: ${currentUser.fullName || currentUser.username}`;
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    userInfoCell.font = { size: 11 };
    userInfoCell.alignment = { horizontal: 'left' };
    currentRow += 2;

    let rowIndex = 1;
    let totalMatched = 0;
    let totalMissing = 0;
    let totalExcess = 0;

    // Header bảng chính
    const headers = [
      'STT', 'Tên tài sản', 'Mã tài sản', 'Loại tài sản',
      'SL hệ thống', 'SL kiểm kê', 'Chênh lệch', 'Phương pháp', 'Trạng thái', 'Ghi chú', 'Ngày KK'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
      };
      this.setCellBorder(cell, true);
    });
    currentRow++;

    // Thêm dữ liệu tài sản cố định
    if (roomResults.fixedAssets?.length > 0) {
      // Header section cho tài sản cố định
      const fixedAssetHeaderCell = worksheet.getCell(`A${currentRow}`);
      fixedAssetHeaderCell.value = '=== TÀI SẢN CỐ ĐỊNH ===';
      worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
      fixedAssetHeaderCell.font = { bold: true, size: 12 };
      fixedAssetHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      fixedAssetHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F2F2F2' }
      };
      this.setCellBorder(fixedAssetHeaderCell, true);
      currentRow++;

      roomResults.fixedAssets.forEach((result) => {
        if (this.shouldIncludeAsset(result, exportDto)) {
          const difference = result.countedQuantity - result.systemQuantity;
          
          const rowData = [
            rowIndex++,
            result.asset?.name || '',
            result.asset?.fixedCode || result.asset?.ktCode || '',
            'Tài sản cố định',
            result.systemQuantity,
            result.countedQuantity,
            difference,
            this.getScanMethodText(result.scanMethod),
            this.getStatusText(result.status),
            result.note || '',
            new Date(result.createdAt).toLocaleDateString('vi-VN')
          ];

          rowData.forEach((value, index) => {
            const cell = worksheet.getCell(currentRow, index + 1);
            cell.value = value;
            cell.alignment = { horizontal: index === 1 || index === 9 ? 'left' : 'center', vertical: 'middle' };
            
            // Styling theo trạng thái
            if (index === 8) { // Cột trạng thái
              this.applyCellStatusStyling(cell, result.status);
            }
            
            this.setCellBorder(cell, false);
          });

          // Đếm theo trạng thái
          switch (result.status) {
            case 'MATCHED': totalMatched++; break;
            case 'MISSING': totalMissing++; break;
            case 'EXCESS': totalExcess++; break;
          }
          
          currentRow++;
        }
      });
    }

    // Thêm dữ liệu công cụ dụng cụ
    if (roomResults.toolsEquipment?.length > 0) {
      // Header section cho công cụ dụng cụ
      const toolsHeaderCell = worksheet.getCell(`A${currentRow}`);
      toolsHeaderCell.value = '=== CÔNG CỤ DỤNG CỤ ===';
      worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
      toolsHeaderCell.font = { bold: true, size: 12 };
      toolsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      toolsHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F2F2F2' }
      };
      this.setCellBorder(toolsHeaderCell, true);
      currentRow++;

      roomResults.toolsEquipment.forEach((result) => {
        if (this.shouldIncludeAsset(result, exportDto)) {
          const difference = result.countedQuantity - result.systemQuantity;
          
          const rowData = [
            rowIndex++,
            result.asset?.name || '',
            result.asset?.fixedCode || result.asset?.ktCode || '',
            'Công cụ dụng cụ',
            result.systemQuantity,
            result.countedQuantity,
            difference,
            this.getScanMethodText(result.scanMethod),
            this.getStatusText(result.status),
            result.note || '',
            new Date(result.createdAt).toLocaleDateString('vi-VN')
          ];

          rowData.forEach((value, index) => {
            const cell = worksheet.getCell(currentRow, index + 1);
            cell.value = value;
            cell.alignment = { horizontal: index === 1 || index === 9 ? 'left' : 'center', vertical: 'middle' };
            
            if (index === 8) {
              this.applyCellStatusStyling(cell, result.status);
            }
            
            this.setCellBorder(cell, false);
          });

          switch (result.status) {
            case 'MATCHED': totalMatched++; break;
            case 'MISSING': totalMissing++; break;
            case 'EXCESS': totalExcess++; break;
          }
          
          currentRow++;
        }
      });
    }

    // Bảng thống kê
    currentRow += 2;
    const statsTitle = worksheet.getCell(`A${currentRow}`);
    statsTitle.value = 'THỐNG KÊ TỔNG HỢP';
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    statsTitle.font = { bold: true, size: 14 };
    statsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    statsTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6F3FF' }
    };
    this.setCellBorder(statsTitle, true);
    currentRow += 2;

    // Thống kê chi tiết
    const totalAssets = (roomResults.summary?.totalAssets || 0);
    const statsData = [
      ['Tổng số tài sản cố định:', roomResults.summary?.totalFixedAssets || 0],
      ['Tổng số công cụ dụng cụ:', roomResults.summary?.totalToolsEquipment || 0],
      ['Tổng số tài sản:', totalAssets],
      ['Số tài sản khớp:', totalMatched],
      ['Số tài sản thiếu:', totalMissing],
      ['Số tài sản thừa:', totalExcess],
      ['Tỷ lệ khớp:', `${totalAssets > 0 ? ((totalMatched / totalAssets) * 100).toFixed(1) : 0}%`],
    ];

    statsData.forEach(([label, value]) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      const valueCell = worksheet.getCell(`B${currentRow}`);
      valueCell.value = value;
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      this.setCellBorder(labelCell, false);
      this.setCellBorder(valueCell, false);
      currentRow++;
    });

    // Chuyển đổi workbook thành buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
  }

  /**
   * Xuất kết quả kiểm kê của nhiều phòng ra file Excel với format chuyên nghiệp
   */
  async exportMultiRoomInventoryToExcel(
    exportDto: ExportMultiRoomInventoryExcelDto,
    currentUser: User
  ): Promise<Buffer> {
    // Lấy thông tin đơn vị
    const unit = await this.unitRepository.findOne({
      where: { id: exportDto.unitId }
    });

    if (!unit) {
      throw new NotFoundException(`Không tìm thấy đơn vị với ID: ${exportDto.unitId}`);
    }

    // Lấy kết quả kiểm kê nhiều phòng
    const multiRoomFilter: MultiRoomInventoryFilterDto = {
      unitId: exportDto.unitId,
      page: 1,
      limit: 1000, // Lấy tất cả để export
      assetType: exportDto.assetType,
    };

    const multiRoomResults = await this.getMultiRoomInventoryResults(multiRoomFilter);

    // Tạo workbook với ExcelJS để có styling đẹp
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo kiểm kê tài sản');

    // Thiết lập width cho các cột
    worksheet.columns = [
      { width: 5 },   // STT
      { width: 15 },  // Phòng
      { width: 35 },  // Tên tài sản
      { width: 15 },  // Mã tài sản
      { width: 15 },  // Loại tài sản
      { width: 12 },  // Số lượng hệ thống
      { width: 12 },  // Số lượng kiểm kê
      { width: 10 },  // Chênh lệch
      { width: 15 },  // Phương pháp quét
      { width: 12 },  // Trạng thái
      { width: 30 },  // Ghi chú
      { width: 12 },  // Ngày kiểm kê
    ];

    let currentRow = 1;

    // Tiêu đề báo cáo
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'BÁO CÁO KIỂM KÊ TÀI SẢN NĂM 2025';
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6F3FF' }
    };
    currentRow += 2;

    // Thông tin đơn vị và ngày
    const unitInfoCell = worksheet.getCell(`A${currentRow}`);
    unitInfoCell.value = `Đơn vị: ${unit.name}`;
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    unitInfoCell.font = { bold: true, size: 12 };
    unitInfoCell.alignment = { horizontal: 'left' };
    currentRow++;

    const dateInfoCell = worksheet.getCell(`A${currentRow}`);
    dateInfoCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`;
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    dateInfoCell.font = { size: 11 };
    dateInfoCell.alignment = { horizontal: 'left' };
    currentRow++;

    const userInfoCell = worksheet.getCell(`A${currentRow}`);
    userInfoCell.value = `Người xuất: ${currentUser.fullName || currentUser.username}`;
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    userInfoCell.font = { size: 11 };
    userInfoCell.alignment = { horizontal: 'left' };
    currentRow += 2;

    let globalRowIndex = 1;
    let totalAssets = 0;
    let totalMatched = 0;
    let totalMissing = 0;
    let totalExcess = 0;

    // Lặp qua từng phòng
    multiRoomResults.rooms.forEach((room) => {
      // Header phòng
      const roomHeaderCell = worksheet.getCell(`A${currentRow}`);
      roomHeaderCell.value = `=== ${room.roomName} ===`;
      worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
      roomHeaderCell.font = { bold: true, size: 14 };
      roomHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      roomHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D3D3D3' }
      };
      // Border cho header phòng
      this.setCellBorder(roomHeaderCell, true);
      currentRow++;

      // Header bảng
      const headers = [
        'STT', 'Phòng', 'Tên tài sản', 'Mã tài sản', 'Loại tài sản',
        'SL hệ thống', 'SL kiểm kê', 'Chênh lệch', 'Phương pháp', 'Trạng thái', 'Ghi chú', 'Ngày KK'
      ];

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' }
        };
        this.setCellBorder(cell, true);
      });
      currentRow++;

      const roomStartRow = currentRow;
      let roomAssetCount = 0;

      // Thêm tài sản cố định
      if (room.fixedAssets?.length > 0) {
        room.fixedAssets.forEach((asset) => {
          if (this.shouldIncludeMultiRoomAsset(asset, exportDto)) {
            const difference = asset.countedQuantity - asset.systemQuantity;
            
            // Dữ liệu row
            const rowData = [
              globalRowIndex++,
              room.roomName,
              asset.asset?.name || '',
              asset.asset?.fixedCode || asset.asset?.ktCode || '',
              'Tài sản cố định',
              asset.systemQuantity,
              asset.countedQuantity,
              difference,
              this.getScanMethodText(asset.scanMethod),
              this.getStatusText(asset.status),
              asset.note || '',
              new Date(asset.createdAt).toLocaleDateString('vi-VN')
            ];

            rowData.forEach((value, index) => {
              const cell = worksheet.getCell(currentRow, index + 1);
              cell.value = value;
              cell.alignment = { horizontal: index === 2 || index === 10 ? 'left' : 'center', vertical: 'middle' };
              
              // Styling theo trạng thái
              if (index === 9) { // Cột trạng thái
                this.applyCellStatusStyling(cell, asset.status);
              }
              
              this.setCellBorder(cell, false);
            });
            
            currentRow++;
            roomAssetCount++;
            totalAssets++;
            
            // Đếm theo trạng thái
            switch (asset.status) {
              case 'MATCHED': totalMatched++; break;
              case 'MISSING': totalMissing++; break;
              case 'EXCESS': totalExcess++; break;
            }
          }
        });
      }

      // Thêm công cụ dụng cụ
      if (room.toolsEquipment?.length > 0) {
        room.toolsEquipment.forEach((asset) => {
          if (this.shouldIncludeMultiRoomAsset(asset, exportDto)) {
            const difference = asset.countedQuantity - asset.systemQuantity;
            
            const rowData = [
              globalRowIndex++,
              room.roomName,
              asset.asset?.name || '',
              asset.asset?.fixedCode || asset.asset?.ktCode || '',
              'Công cụ dụng cụ',
              asset.systemQuantity,
              asset.countedQuantity,
              difference,
              this.getScanMethodText(asset.scanMethod),
              this.getStatusText(asset.status),
              asset.note || '',
              new Date(asset.createdAt).toLocaleDateString('vi-VN')
            ];

            rowData.forEach((value, index) => {
              const cell = worksheet.getCell(currentRow, index + 1);
              cell.value = value;
              cell.alignment = { horizontal: index === 2 || index === 10 ? 'left' : 'center', vertical: 'middle' };
              
              if (index === 9) {
                this.applyCellStatusStyling(cell, asset.status);
              }
              
              this.setCellBorder(cell, false);
            });
            
            currentRow++;
            roomAssetCount++;
            totalAssets++;
            
            switch (asset.status) {
              case 'MATCHED': totalMatched++; break;
              case 'MISSING': totalMissing++; break;
              case 'EXCESS': totalExcess++; break;
            }
          }
        });
      }

      // Dòng tổng cộng phòng
      const summaryCell = worksheet.getCell(`A${currentRow}`);
      summaryCell.value = `Tổng cộng phòng ${room.roomName}`;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      summaryCell.font = { bold: true };
      summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
      summaryCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2CC' }
      };

      const countCell = worksheet.getCell(`C${currentRow}`);
      countCell.value = `${roomAssetCount} tài sản`;
      countCell.font = { bold: true };
      countCell.alignment = { horizontal: 'left', vertical: 'middle' };
      countCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2CC' }
      };

      // Border cho dòng tổng cộng
      for (let col = 1; col <= 12; col++) {
        this.setCellBorder(worksheet.getCell(currentRow, col), true);
      }

      currentRow += 2; // Khoảng cách giữa các phòng
    });

    // Bảng thống kê tổng hợp
    currentRow += 2;
    const statsTitle = worksheet.getCell(`A${currentRow}`);
    statsTitle.value = 'THỐNG KÊ TỔNG HỢP';
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    statsTitle.font = { bold: true, size: 14 };
    statsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    statsTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6F3FF' }
    };
    this.setCellBorder(statsTitle, true);
    currentRow += 2;

    // Bảng thống kê chi tiết
    const statsData = [
      ['Tổng số tài sản:', totalAssets],
      ['Số tài sản khớp:', totalMatched],
      ['Số tài sản thiếu:', totalMissing],  
      ['Số tài sản thừa:', totalExcess],
      ['Tỷ lệ khớp:', `${totalAssets > 0 ? ((totalMatched / totalAssets) * 100).toFixed(1) : 0}%`],
    ];

    statsData.forEach(([label, value]) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = label;
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      const valueCell = worksheet.getCell(`B${currentRow}`);
      valueCell.value = value;
      valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      this.setCellBorder(labelCell, false);
      this.setCellBorder(valueCell, false);
      currentRow++;
    });

    // Chuyển đổi workbook thành buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(excelBuffer);
  }

  // === HELPER METHODS FOR EXPORT ===

  private shouldIncludeAsset(asset: InventoryResultResponseDto, exportDto: ExportInventoryExcelDto): boolean {
    // Filter by asset type if specified
    if (exportDto.assetType && asset.asset?.type !== exportDto.assetType) {
      return false;
    }

    // Filter by status if specified
    if (exportDto.statusFilter && exportDto.statusFilter.length > 0) {
      return exportDto.statusFilter.includes(asset.status);
    }

    return true;
  }

  private shouldIncludeMultiRoomAsset(asset: AssetInventorySimpleDto, exportDto: ExportMultiRoomInventoryExcelDto): boolean {
    // Filter by asset type if specified
    if (exportDto.assetType && asset.asset?.type !== exportDto.assetType) {
      return false;
    }

    // Filter by status if specified
    if (exportDto.statusFilter && exportDto.statusFilter.length > 0) {
      return exportDto.statusFilter.includes(asset.status);
    }

    return true;
  }

  private getScanMethodText(scanMethod: string): string {
    switch (scanMethod) {
      case 'RFID':
        return 'RFID';
      case 'MANUAL':
        return 'Thủ công';
      default:
        return scanMethod || 'Không xác định';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'MATCHED':
        return 'Khớp';
      case 'MISSING':
        return 'Thiếu';
      case 'EXCESS':
        return 'Thừa';
      case 'BROKEN':
        return 'Hư hỏng';
      case 'NEEDS_REPAIR':
        return 'Cần sửa chữa';
      case 'LIQUIDATION_PROPOSED':
        return 'Đề xuất thanh lý';
      default:
        return status || 'Không xác định';
    }
  }

  private getAssetTypeText(assetType: string): string {
    switch (assetType) {
      case 'FIXED_ASSET':
        return 'Tài sản cố định';
      case 'TOOLS_EQUIPMENT':
        return 'Công cụ dụng cụ';
      default:
        return assetType || 'Không xác định';
    }
  }

  // === HELPER METHODS FOR EXCEL STYLING ===

  private setCellBorder(cell: any, thick = false): void {
    const borderStyle = thick ? 'medium' : 'thin';
    cell.border = {
      top: { style: borderStyle },
      left: { style: borderStyle },
      bottom: { style: borderStyle },
      right: { style: borderStyle }
    };
  }

  private applyCellStatusStyling(cell: any, status: string): void {
    switch (status) {
      case 'MATCHED':
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C6EFCE' } // Xanh nhạt
        };
        break;
      case 'MISSING':
        cell.fill = {
          type: 'pattern', 
          pattern: 'solid',
          fgColor: { argb: 'FFC7CE' } // Đỏ nhạt
        };
        break;
      case 'EXCESS':
        cell.fill = {
          type: 'pattern',
          pattern: 'solid', 
          fgColor: { argb: 'FFEB9C' } // Vàng nhạt
        };
        break;
      default:
        // Không styling đặc biệt
        break;
    }
  }

  /**
   * Lấy thống kê kết quả kiểm kê theo nhiều mức độ
   */
  async getInventoryStatistics(
    filterDto: InventoryStatisticsFilterDto
  ): Promise<InventoryStatisticsResponseDto> {
    const { level = StatisticsLevel.ALL, sessionUnitId, groupId, assignmentId, roomId, assetType } = filterDto;

    // Tạo query builder cơ bản
    let query = this.inventoryResultRepository
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.asset', 'asset')
      .leftJoinAndSelect('result.room', 'room')
      .leftJoinAndSelect('result.assignment', 'assignment')
      .leftJoinAndSelect('assignment.group', 'group')
      .leftJoinAndSelect('group.subInventory', 'subInventory')
      .leftJoinAndSelect('subInventory.inventorySessionUnit', 'sessionUnit')
      .leftJoinAndSelect('sessionUnit.inventorySession', 'session')
      .where('result.deletedAt IS NULL')
      .andWhere('asset.deletedAt IS NULL')
      .andWhere('room.deletedAt IS NULL');

    // Áp dụng filter theo roomId
    if (roomId) {
      query = query.andWhere('result.roomId = :roomId', { roomId });
    }

    // Áp dụng filter theo assignmentId
    if (assignmentId) {
      query = query.andWhere('result.assignmentId = :assignmentId', { assignmentId });
    }

    // Áp dụng filter theo groupId
    if (groupId) {
      query = query.andWhere('group.id = :groupId', { groupId });
    }

    // Áp dụng filter theo sessionUnitId
    if (sessionUnitId) {
      query = query.andWhere('sessionUnit.id = :sessionUnitId', { sessionUnitId });
    }

    // Áp dụng filter theo loại tài sản
    if (assetType && assetType !== 'ALL') {
      query = query.andWhere('asset.type = :assetType', { assetType });
    }

    // Lấy tất cả kết quả
    const results = await query.getMany();

    // Tính thống kê tổng quan
    const overallStatusStats = this.calculateStatusStatistics(results);
    const overallAssetTypeStats = this.calculateAssetTypeStatistics(results);
    const overallScanMethodStats = this.calculateScanMethodStatistics(results);

    // Tính thống kê theo level
    let levelStatistics: LevelStatisticsItemDto[] = [];

    switch (level) {
      case StatisticsLevel.ROOM:
        // Thống kê theo phòng
        const roomMap = new Map<string, any[]>();
        results.forEach(result => {
          const key = result.roomId;
          if (!roomMap.has(key)) {
            roomMap.set(key, []);
          }
          roomMap.get(key)!.push(result);
        });

        for (const [roomIdKey, roomResults] of roomMap.entries()) {
          const room = roomResults[0].room;
          levelStatistics.push({
            id: roomIdKey,
            name: room?.name || room?.roomCode || 'Không xác định',
            totalAssets: roomResults.length,
            statusStatistics: this.calculateStatusStatistics(roomResults),
            assetTypeStatistics: this.calculateAssetTypeStatistics(roomResults),
            scanMethodStatistics: this.calculateScanMethodStatistics(roomResults),
          });
        }
        break;

      case StatisticsLevel.ASSIGNMENT:
        // Thống kê theo phân công
        const assignmentMap = new Map<string, any[]>();
        results.forEach(result => {
          const key = result.assignmentId;
          if (!assignmentMap.has(key)) {
            assignmentMap.set(key, []);
          }
          assignmentMap.get(key)!.push(result);
        });

        for (const [assignmentIdKey, assignmentResults] of assignmentMap.entries()) {
          const assignment = assignmentResults[0].assignment;
          levelStatistics.push({
            id: assignmentIdKey,
            name: assignment?.unit?.name || 'Không xác định',
            totalAssets: assignmentResults.length,
            statusStatistics: this.calculateStatusStatistics(assignmentResults),
            assetTypeStatistics: this.calculateAssetTypeStatistics(assignmentResults),
            scanMethodStatistics: this.calculateScanMethodStatistics(assignmentResults),
          });
        }
        break;

      case StatisticsLevel.GROUP:
        // Thống kê theo nhóm
        const groupMap = new Map<string, any[]>();
        results.forEach(result => {
          const groupIdKey = result.assignment?.group?.id;
          if (groupIdKey) {
            if (!groupMap.has(groupIdKey)) {
              groupMap.set(groupIdKey, []);
            }
            groupMap.get(groupIdKey)!.push(result);
          }
        });

        for (const [groupIdKey, groupResults] of groupMap.entries()) {
          const group = groupResults[0].assignment?.group;
          levelStatistics.push({
            id: groupIdKey,
            name: group?.name || 'Không xác định',
            totalAssets: groupResults.length,
            statusStatistics: this.calculateStatusStatistics(groupResults),
            assetTypeStatistics: this.calculateAssetTypeStatistics(groupResults),
            scanMethodStatistics: this.calculateScanMethodStatistics(groupResults),
          });
        }
        break;

      case StatisticsLevel.SESSION_UNIT:
        // Thống kê theo cơ sở
        const sessionUnitMap = new Map<string, any[]>();
        results.forEach(result => {
          const sessionUnitIdKey = result.assignment?.group?.subInventory?.inventorySessionUnit?.id;
          if (sessionUnitIdKey) {
            if (!sessionUnitMap.has(sessionUnitIdKey)) {
              sessionUnitMap.set(sessionUnitIdKey, []);
            }
            sessionUnitMap.get(sessionUnitIdKey)!.push(result);
          }
        });

        for (const [sessionUnitIdKey, sessionUnitResults] of sessionUnitMap.entries()) {
          const sessionUnit = sessionUnitResults[0].assignment?.group?.subInventory?.inventorySessionUnit;
          levelStatistics.push({
            id: sessionUnitIdKey,
            name: sessionUnit?.unit?.name || 'Không xác định',
            totalAssets: sessionUnitResults.length,
            statusStatistics: this.calculateStatusStatistics(sessionUnitResults),
            assetTypeStatistics: this.calculateAssetTypeStatistics(sessionUnitResults),
            scanMethodStatistics: this.calculateScanMethodStatistics(sessionUnitResults),
          });
        }
        break;

      case StatisticsLevel.ALL:
      default:
        // Không cần thống kê chi tiết theo level
        break;
    }

    return {
      level,
      totalAssets: results.length,
      overallStatusStatistics: overallStatusStats,
      overallAssetTypeStatistics: overallAssetTypeStats,
      overallScanMethodStatistics: overallScanMethodStats,
      levelStatistics,
    };
  }

  /**
   * Tính thống kê theo trạng thái
   */
  private calculateStatusStatistics(results: any[]): StatusStatisticsDto {
    return {
      matched: results.filter(r => r.status === InventoryResultStatus.MATCHED).length,
      missing: results.filter(r => r.status === InventoryResultStatus.MISSING).length,
      excess: results.filter(r => r.status === InventoryResultStatus.EXCESS).length,
      broken: results.filter(r => r.status === InventoryResultStatus.BROKEN).length,
      needsRepair: results.filter(r => r.status === InventoryResultStatus.NEEDS_REPAIR).length,
      liquidationProposed: results.filter(r => r.status === InventoryResultStatus.LIQUIDATION_PROPOSED).length,
    };
  }

  /**
   * Tính thống kê theo loại tài sản
   */
  private calculateAssetTypeStatistics(results: any[]): AssetTypeStatisticsDto {
    return {
      fixedAssets: results.filter(r => r.asset?.type === 'FIXED_ASSET').length,
      toolsEquipment: results.filter(r => r.asset?.type === 'TOOLS_EQUIPMENT').length,
    };
  }

  /**
   * Tính thống kê theo phương pháp quét
   */
  private calculateScanMethodStatistics(results: any[]): ScanMethodStatisticsDto {
    return {
      rfid: results.filter(r => r.scanMethod === 'RFID').length,
      manual: results.filter(r => r.scanMethod === 'MANUAL').length,
    };
  }
}
