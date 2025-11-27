import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset, FixedAsset } from "src/entities/asset.entity";
import { Room } from "src/entities/room.entity";
import { User } from "src/entities/user.entity";
import {
  In,
  Repository,
  SelectQueryBuilder,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from "typeorm";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { Alert, AlertStatus, AlertType } from "src/entities/alert.entity";
import { UserAlertResponseDto } from "./dto/user-alert-response.dto";
import { AssetBook } from "src/entities/asset-book.entity";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { RfidTag } from "src/entities/rfid-tag.entity";
import { UpdateAlertDto } from "./dto/update-alert.dto";
import { UpdateAlertImageDto } from "./dto/update-alert-image.dto";
import { FilesService } from "../files/files.service";
import { EmailService } from "../email/email.service";
import { MovementsService } from "../movements/movements.service";
import { MoveStatus } from "src/common/shared/MoveStatus";
import { AlertFilterDto } from "./dto/alert-filter.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { FieldType } from "src/common/dto/filter.dto";
import { FilterUtil } from "src/common/utils/filter.util";
import { UnitResponseDto } from "../units/dto/unit-response.dto";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import { RoleBase } from "src/common/utils/role.enum";
import { Unit } from "src/entities/unit.entity";
import { SendAlertEmailResponseDto } from "./dto/send-alert-email.dto";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(AssetBook)
    private readonly assetBookRepository: Repository<AssetBook>,
    @InjectRepository(AssetBookItem)
    private readonly assetBookItemRepository: Repository<AssetBookItem>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly filesService: FilesService,
    private readonly emailService: EmailService,
    private readonly permissionHelperService: PermissionHelperService
  ,
  private readonly movementsService: MovementsService
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
    try {
      const { assetId, roomId } = createAlertDto;
      // kiểm tra assetId và roomId có tồn tại trong database không
      const asset = await this.assetRepository.findOne({
        where: { id: assetId },
      });
      const room = await this.roomRepository.findOne({ where: { id: roomId } });

      if (!asset) {
        throw new Error("Asset not found");
      }

      if (!room) {
        throw new Error("Room not found");
      }

      // Nếu cả asset và room đều tồn tại, tiến hành tạo alert
      const alert = this.alertRepository.create({
        assetId: asset.id,
        roomId: room.id,
        type: AlertType.UNAUTHORIZED_MOVEMENT,
        status: AlertStatus.PENDING,
        image: createAlertDto.image ? createAlertDto.image : undefined,
        deviceId: createAlertDto.deviceId,
      });

      const savedAlert = await this.alertRepository.save(alert);
      const alertResponse = await this.alertRepository.findOne({
        where: { id: savedAlert.id },
        relations: ["asset", "room", "resolver"],
      });

      return await this.transformToResponseDto(alertResponse);
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  }

  async getUserRfidAlerts(rfids: string[]): Promise<UserAlertResponseDto[]> {
    try {
      // Tìm tài khoản đơn vị sử dụng tài sản có RFID trong danh sách rfids trong sổ tài sản
      const results: UserAlertResponseDto[] = [];

      for (const rfid of rfids) {
        // Tìm RFID tag
        const rfidTag = await this.rfidTagRepository.findOne({
          where: { rfidId: rfid },
          relations: ["asset"],
        });

        if (!rfidTag) {
          // Nếu không tìm thấy RFID tag, vẫn trả về với danh sách user rỗng
          results.push({
            rfid,
            userIds: [],
            allowMove: true,
            assetId: null,
          });
          continue;
        }

        // Tìm tài sản trong sổ tài sản (asset book items)
        const assetBookItems = await this.assetBookItemRepository.find({
          where: {
            assetId: rfidTag.assetId,
          },
          relations: ["book", "book.unit", "book.unit.users"],
        });

        // Lấy danh sách user ID từ các đơn vị sử dụng tài sản
        const userIds: string[] = [];

        for (const item of assetBookItems) {
          if (item.book?.unit) {
            // Thêm representative ID nếu có
            if (item.book.unit.representativeId) {
              userIds.push(item.book.unit.representativeId);
            }
          }
        }

        // Loại bỏ duplicate user IDs
        const uniqueUserIds = [...new Set(userIds)];

        results.push({
          rfid,
          userIds: uniqueUserIds,
          allowMove: rfidTag.asset ? rfidTag.asset.allowMove : true,
          assetId: rfidTag.assetId,
        });
      }

      return results;
    } catch (error) {
      console.error("Error getting user RFID alerts:", error);
      throw error;
    }
  }

  async createManyAlerts(
    createAlertDtos: CreateAlertDto[]
  ): Promise<AlertResponseDto[]> {
    try {
      const alerts: Alert[] = [];
      const lstError = [];

      // Lấy danh sách assetId và roomId từ createAlertDtos để truy vấn một lần (tránh query trong vòng lặp)
      const lstAssetId = createAlertDtos.map((dto) => dto.assetId);
      const lstRoomId = createAlertDtos.map((dto) => dto.roomId);
      const assets = await this.assetRepository.findByIds(lstAssetId);
      const rooms = await this.roomRepository.findByIds(lstRoomId);

      createAlertDtos.map(async (dto, index) => {
        const { assetId, roomId } = dto;
        const asset = assets.find((a) => a.id === assetId);
        const room = rooms.find((r) => r.id === roomId);
        if (!asset) {
          lstError.push({ index, message: "Asset not found" });
        } else if (!room) {
          lstError.push({ index, message: "Room not found" });
        } else {
          const alert = this.alertRepository.create({
            assetId: asset.id,
            roomId: room.id,
            type: AlertType.UNAUTHORIZED_MOVEMENT,
            status: AlertStatus.PENDING,
            image: dto.image ? dto.image : undefined,
            deviceId: dto.deviceId,
          });
          alerts.push(alert);
        }
      });
      await this.alertRepository.save(alerts);
      const savedAlertData = await this.alertRepository.find({
        where: { id: In(alerts.map((a) => a.id)) },
        relations: ["asset", "room", "resolver"],
      });
      
      const responsePromises = savedAlertData.map((alert) => this.transformToResponseDto(alert));
      return await Promise.all(responsePromises);
    } catch (error) {
      console.error("Error creating multiple alerts:", error);
      throw error;
    }
  }

  async findAll(): Promise<AlertResponseDto[]> {
    try {
      const alerts = await this.alertRepository.find({
        relations: ["asset", "room", "resolver"],
        order: { createdAt: "DESC" },
      });
      
      const responsePromises = alerts.map((alert) => this.transformToResponseDto(alert));
      return await Promise.all(responsePromises);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      throw error;
    }
  }

  async findAllWithFilter(
    filterDto: AlertFilterDto,
    currentUser: User
  ): Promise<PaginatedResponseDto<AlertResponseDto>> {
    try {
      const config = {
        searchFields: [
          'deviceId',
          'note', 
          'asset.name',
          'asset.fixedCode',
          'room.name',
          'room.code',
          'room.location'
        ],
        fieldTypeMap: {
          status: FieldType.SELECT,
          type: FieldType.SELECT,
          createdAt: FieldType.DATE,
          assetName: FieldType.TEXT,
          assetCode: FieldType.TEXT,
          roomName: FieldType.TEXT,
          roomCode: FieldType.TEXT,
          deviceId: FieldType.TEXT,
        },
        defaultSorting: { field: "createdAt", direction: "DESC" as const },
        relations: ["asset", "room", "resolver"],
      };

      // Handle quick filters for backward compatibility
      if (filterDto.statusFilter || filterDto.createdFrom || filterDto.createdTo) {
        // Add quick filter conditions to the existing conditions
        const quickFilterConditions = [];

        if (filterDto.createdFrom) {
          quickFilterConditions.push({
            field: "createdAt",
            fieldType: "date",
            operator: "greaterThanOrEqual",
            value: [filterDto.createdFrom],
            dateFrom: filterDto.createdFrom,
          });
        }

        if (filterDto.createdTo) {
          quickFilterConditions.push({
            field: "createdAt",
            fieldType: "date", 
            operator: "lessThanOrEqual",
            value: [filterDto.createdTo],
            dateTo: filterDto.createdTo,
          });
        }

        if (filterDto.statusFilter) {
          quickFilterConditions.push({
            field: "status",
            fieldType: "select",
            operator: "equals",
            value: [filterDto.statusFilter],
          });
        }

        // Merge with existing conditions
        filterDto.conditions = [
          ...(filterDto.conditions || []),
          ...quickFilterConditions,
        ];
      }

      // Build query manually to handle async transformation
      const queryBuilder = FilterUtil.buildBaseQuery(this.alertRepository, config, "alert");
      
      // Apply filters
      FilterUtil.applyFiltersToQuery(queryBuilder, filterDto, config, "alert");

      // Apply role-based filtering
      await this.applyRoleBasedFiltering(queryBuilder, currentUser);

      // Get pagination settings with defaults
      const page = filterDto.pagination?.currentPage || 1;
      const limit = filterDto.pagination?.itemsPerPage || 5;
      const skip = (page - 1) * limit;

      // Apply pagination
      queryBuilder.skip(skip).take(limit);

      // Execute query and get count
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Transform to response DTOs with async support
      const responsePromises = entities.map((alert) => this.transformToResponseDto(alert));
      const data = await Promise.all(responsePromises);

      // Calculate pagination metadata
      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      return new PaginatedResponseDto(data, pagination);
    } catch (error) {
      console.error("Error in findAllWithFilter:", error);
      throw error;
    }
  }

  /**
   * Apply role-based filtering to the query builder
   * @param queryBuilder Query builder instance
   * @param currentUser Current user
   */
  private async applyRoleBasedFiltering(
    queryBuilder: SelectQueryBuilder<Alert>,
    currentUser: User
  ): Promise<void> {
    // Load user with roles if not already loaded
    const userWithRoles = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['roles', 'unit']
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return;
    }

    const roleCodes = userWithRoles.roles.map(role => role.code);

    // Admin có thể thấy tất cả alerts
    if (roleCodes.includes(RoleBase.ADMIN)) {
      return; // Không thêm điều kiện gì, thấy tất cả
    }

    // Admin Dept chỉ thấy alerts của các assets thuộc đơn vị trong cơ sở của mình
    if (roleCodes.includes(RoleBase.ADMIN_DEPT)) {
      if (userWithRoles.unitId) {
        // Lấy tất cả unit IDs thuộc campus này (bao gồm cả campus và tất cả children)
        const allUnitIds = await this.getAllChildUnitIds(userWithRoles.unitId);
        
        // Sử dụng alias 'asset' đã có từ relations config
        queryBuilder
          .leftJoin('asset.currentRoom', 'assetRoom')
          .leftJoin('assetRoom.unit', 'roomUnit')
          .andWhere('roomUnit.id IN (:...unitIds)', { unitIds: allUnitIds });
      }
      return;
    }

    // User Dept chỉ thấy alerts của assets thuộc đơn vị của mình
    if (roleCodes.includes(RoleBase.USER_DEPT)) {
      if (userWithRoles.unitId) {
        // Sử dụng alias 'asset' đã có từ relations config
        queryBuilder
          .leftJoin('asset.currentRoom', 'assetRoom')
          .leftJoin('assetRoom.unit', 'roomUnit')
          .andWhere('roomUnit.id = :unitId', { unitId: userWithRoles.unitId });
      }
      return;
    }
  }

  /**
   * Get all child unit IDs for a given campus ID
   * @param campusId Campus ID
   * @returns Array of unit IDs including campus and all children
   */
  private async getAllChildUnitIds(campusId: string): Promise<string[]> {
    const campus = await this.unitRepository.findOne({
      where: { id: campusId },
      relations: ['childUnits']
    });

    if (!campus) {
      return [campusId];
    }

    const unitIds = [campusId];
    if (campus.childUnits) {
      unitIds.push(...campus.childUnits.map(unit => unit.id));
    }

    return unitIds;
  }

  async resolveAlert(
    alertId: string,
    updateAlertDto: UpdateAlertDto,
    currentUser: User
  ): Promise<AlertResponseDto> {
    try {
      const alert = await this.alertRepository.findOne({
        where: { id: alertId },
      });
      if (!alert) {
        throw new Error("Alert not found");
      }

      alert.status = updateAlertDto.status;
      alert.note = updateAlertDto.note;
      alert.resolverId = currentUser.id;

      const savedAlert = await this.alertRepository.save(alert);
      return await this.transformToResponseDto(savedAlert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      throw error;
    }
  }

  private async transformToResponseDto(alert: Alert): Promise<AlertResponseDto> {
    let rfidId = null;

    // If asset is a FixedAsset, try to get RFID from database
    if (alert.asset && alert.asset.type === "FIXED_ASSET") {
      try {
        const rfidTag = await this.rfidTagRepository.findOne({
          where: { assetId: alert.asset.id }
        });
        rfidId = rfidTag?.rfidId || null;
      } catch (error) {
        console.warn(`Could not fetch RFID for asset ${alert.asset.id}:`, error);
      }
    }

    return {
      id: alert.id,
      status: alert.status,
      type: alert.type,
      createdAt: alert.createdAt,
      deviceId: alert.deviceId,
      room: alert.room
        ? {
            id: alert.room.id,
            name: alert.room.name,
          }
        : undefined,
      asset: alert.asset
        ? {
            id: alert.asset.id,
            name: alert.asset.name,
            fixedCode: alert.asset.fixedCode,
            rfid: rfidId,
          }
        : undefined,
      resolver: alert.resolver
        ? {
            id: alert.resolver.id,
            fullName: alert.resolver.fullName,
            email: alert.resolver.email,
          }
        : undefined,
      note: alert.note ? alert.note : undefined,
      image: alert.image ? alert.image : undefined,
      resolvedAt: alert.resolvedAt ? alert.resolvedAt : undefined,
    };
  }

  async updateAlertsImage(
    file: Express.Multer.File,
    alertIds: string[]
  ): Promise<void> {
    try {
      if (!file || !alertIds || alertIds.length === 0) {
        throw new Error("Invalid input");
      }

      // Upload image using FilesService
      const uploadResult = await this.filesService.uploadImage(file);
      const imageUrl = uploadResult.url;

      if (!imageUrl) {
        throw new Error("Image upload failed");
      }

      // Update alerts with the uploaded image URL
      await this.alertRepository.update(
        { id: In(alertIds) },
        { image: imageUrl }
      );
    } catch (error) {
      console.error("Error updating alert images:", error);
      throw error;
    }
  }

  /**
   * Send alert notification email to relevant users
   * @param alertId Alert ID to send notification for
   * @returns Information about sent emails
   */
  async sendAlertEmail(alertId: string): Promise<SendAlertEmailResponseDto> {
    try {
      // 1. Tìm alert với các quan hệ cần thiết
      const alert = await this.alertRepository.findOne({
        where: { id: alertId },
        relations: ['asset', 'room'],
      });

      if (!alert) {
        throw new Error('Alert not found');
      }

      if (!alert.asset) {
        throw new Error('Alert has no associated asset');
      }

      // 2. Tìm AssetBookItem mới nhất của tài sản (sổ tài sản)
      const latestAssetBookItem = await this.assetBookItemRepository.findOne({
        where: { assetId: alert.assetId },
        relations: ['book', 'book.unit', 'book.unit.representative', 'room', 'room.unit', 'room.unit.representative'],
        order: { assignedAt: 'DESC' },
      });

      if (!latestAssetBookItem) {
        throw new Error('Asset not found in any asset book');
      }

      // 3. Lấy danh sách users cần gửi email (chỉ lấy representatives)
      const usersToNotify = new Set<User>();

      // 3.1. Thêm representative của đơn vị sử dụng tài sản (từ sổ tài sản)
      if (latestAssetBookItem.book?.unit?.representative) {
        const representative = latestAssetBookItem.book.unit.representative;
        if (representative.email && representative.status === 'ACTIVE') {
          usersToNotify.add(representative);
        }
      }

      // 3.2. Thêm representative của phòng quản trị (unit của room)
      if (latestAssetBookItem.room?.unit?.representative) {
        const representative = latestAssetBookItem.room.unit.representative;
        if (representative.email && representative.status === 'ACTIVE') {
          usersToNotify.add(representative);
        }
      }

      // 4. Gửi email cho từng user
      const sentEmails: string[] = [];
      const failedEmails: string[] = [];

      const emailPromises = Array.from(usersToNotify).map(async (user) => {
        try {
          const emailSent = await this.emailService.sendEmail({
            to: user.email,
            subject: `⚠️ Cảnh báo: Phát hiện di chuyển tài sản không hợp lệ`,
            template: 'alert-notification',
            context: {
              userName: user.fullName,
              alertType: this.getAlertTypeText(alert.type),
              assetName: alert.asset.name,
              assetCode: alert.asset.fixedCode || 'N/A',
              roomName: alert.room?.name || 'N/A',
              detectedAt: alert.createdAt.toLocaleString('vi-VN'),
              unitName: latestAssetBookItem.book?.unit?.name || 'N/A',
              managementRoom: latestAssetBookItem.room?.unit?.name || 'N/A',
              alertUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/alerts/${alert.id}`,
              year: new Date().getFullYear(),
            },
          });

          if (emailSent) {
            sentEmails.push(user.email);
          } else {
            failedEmails.push(user.email);
          }
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error);
          failedEmails.push(user.email);
        }
      });

      await Promise.all(emailPromises);

      // 5. Trả về kết quả
      return {
        sentEmails,
        failedEmails,
        alertInfo: {
          id: alert.id,
          assetName: alert.asset.name,
          assetCode: alert.asset.fixedCode || 'N/A',
          roomName: alert.room?.name || 'N/A',
          detectedAt: alert.createdAt,
        },
      };
    } catch (error) {
      console.error('Error sending alert email:', error);
      throw error;
    }
  }

  async moveAssetToRoom(alertId: string, toRoomId: string, note: string | undefined, currentUser: User) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId }, relations: ['asset', 'room'] });
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (!alert.asset) {
      throw new Error('Alert has no associated asset to move');
    }

    const asset = await this.assetRepository.findOne({ where: { id: alert.assetId }, relations: ['currentRoom'] });
    if (!asset) {
      throw new Error('Asset not found');
    }

    const destRoom = await this.roomRepository.findOne({ where: { id: toRoomId } });
    if (!destRoom) {
      throw new Error('Destination room not found');
    }

    const fromRoomId = asset.currentRoom ? asset.currentRoom.id : alert.roomId;

    const createMovementDto = {
      items: [
        {
          assetId: alert.assetId,
          fromRoomId: fromRoomId,
          toRoomId: toRoomId,
          note: note || `Di chuyển theo cảnh báo ${alert.id}`,
        },
      ],
      requestNote: note || `Tự động di chuyển tài sản phát hiện từ cảnh báo ${alert.id}`,
      status: MoveStatus.DRAFT,
      approvalNote: 'Tự động phê duyệt từ alert',
      createdAt: new Date().toISOString(),
    } as any;

    let movement = await this.movementsService.createMovement(createMovementDto, currentUser.id, currentUser);

    try {
      movement = await this.movementsService.proposeMovement(movement.id, { 
        note: 'Tự động đề xuất sau xử lý cảnh báo' 
      } as any, currentUser.id);

      movement = await this.movementsService.approveMovement(movement.id, { 
        approvalNote: 'Phê duyệt tự động sau xử lý cảnh báo' 
      } as any, currentUser.id);
    } catch (err) {
      console.error('Failed to propose/approve movement from alert:', err);
      throw new Error('Không thể phê duyệt movement tự động: ' + err.message);
    }

    alert.status = AlertStatus.CONFIRMED;
    alert.resolverId = currentUser.id;
    alert.note = note || alert.note;
    await this.alertRepository.save(alert);

    return movement;
  }

  /**
   * Get human-readable alert type text
   */
  private getAlertTypeText(type: AlertType): string {
    switch (type) {
      case AlertType.UNAUTHORIZED_MOVEMENT:
        return 'Di chuyển không hợp lệ';
      default:
        return 'Không xác định';
    }
  }
}
