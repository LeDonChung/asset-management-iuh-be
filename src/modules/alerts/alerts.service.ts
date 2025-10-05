import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset, FixedAsset } from "src/entities/asset.entity";
import { Room } from "src/entities/room.entity";
import { User } from "src/entities/user.entity";
import { In, Repository } from "typeorm";
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
    private readonly filesService: FilesService
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

      return this.transformToResponseDto(alertResponse);
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
        relations: ["asset", "room", "resolver", "asset.rfidTag"],
      });
      return savedAlertData.map((alert) => this.transformToResponseDto(alert));
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
      return alerts.map((alert) => this.transformToResponseDto(alert));
    } catch (error) {
      console.error("Error fetching alerts:", error);
      throw error;
    }
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

      await this.alertRepository.save(alert);
      return this.transformToResponseDto(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      throw error;
    }
  }

  private transformToResponseDto(alert: Alert): AlertResponseDto {
    return {
      id: alert.id,
      status: alert.status,
      type: alert.type,
      createdAt: alert.createdAt,
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
            rfid:
              (alert.asset.type === "FIXED_ASSET"
                ? (alert.asset as FixedAsset).rfidTag?.rfidId
                : null) || null,
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

  async updateAlertsImage(file: Express.Multer.File, alertIds: string[]): Promise<void> {
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


}
