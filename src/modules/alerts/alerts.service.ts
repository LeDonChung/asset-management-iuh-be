import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset } from "src/entities/asset.entity";
import { Room } from "src/entities/room.entity";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { Alert, AlertStatus, AlertType } from "src/entities/alert.entity";
import { UpdateAlertDto } from "./dto/update-alert.dto";

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
    ) { }

    async create(createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
        try {
            const { assetId, roomId } = createAlertDto;
            // kiểm tra assetId và roomId có tồn tại trong database không
            const asset = await this.assetRepository.findOne({ where: { id: assetId } });
            const room = await this.roomRepository.findOne({ where: { id: roomId } });

            if(!asset) {
                throw new Error("Asset not found");
            }

            if(!room) {
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
            console.log('savedAlert', savedAlert);

            return this.transformToResponseDto(savedAlert);
        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    async createManyAlerts(createAlertDtos: CreateAlertDto[]): Promise<AlertResponseDto[]> {
        try {
            const alerts: Alert[] = [];
            const lstError = [];

            // Lấy danh sách assetId và roomId từ createAlertDtos để truy vấn một lần (tránh query trong vòng lặp)
            const lstAssetId = createAlertDtos.map(dto => dto.assetId);
            const lstRoomId = createAlertDtos.map(dto => dto.roomId);
            const assets = await this.assetRepository.findByIds(lstAssetId);
            const rooms = await this.roomRepository.findByIds(lstRoomId);
            

            createAlertDtos.map(async (dto, index) => {
                const { assetId, roomId } = dto;
                const asset = assets.find(a => a.id === assetId);
                const room = rooms.find(r => r.id === roomId);
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
            return alerts.map(alert => this.transformToResponseDto(alert));
        } catch (error) {
            console.error('Error creating multiple alerts:', error);
            throw error;
        }
    }

    async findAll(): Promise<AlertResponseDto[]> {
        try {
            const alerts = await this.alertRepository.find({
                relations: ['asset', 'room', 'resolver'],
                order: { createdAt: 'DESC' },
            });
            return alerts.map(alert => this.transformToResponseDto(alert));
        } catch (error) {
            console.error('Error fetching alerts:', error);
            throw error;
        }
    }

    async resolveAlert(alertId: string, updateAlertDto: UpdateAlertDto, currentUser: User): Promise<AlertResponseDto> {
        try {
            const alert = await this.alertRepository.findOne({ where: { id: alertId } });
            if (!alert) {
                throw new Error("Alert not found");
            }

            alert.status = updateAlertDto.status;
            alert.note = updateAlertDto.note;
            alert.resolverId = currentUser.id;

            await this.alertRepository.save(alert);
            return this.transformToResponseDto(alert);
        } catch (error) {
            console.error('Error resolving alert:', error);
            throw error;
        }
    }

    private transformToResponseDto(alert: Alert): AlertResponseDto {
        return {
            id: alert.id,
            status: alert.status,
            type: alert.type,
            createdAt: alert.createdAt,
            room: alert.room ? {
                id: alert.room.id,
                name: alert.room.name,
            } : undefined,
            asset: alert.asset ? {
                id: alert.asset.id,
                name: alert.asset.name,
                fixedCode: alert.asset.fixedCode,
            } : undefined,
            resolver: alert.resolver ? {
                id: alert.resolver.id,
                fullName: alert.resolver.fullName,
                email: alert.resolver.email,
            } : undefined,
            note: alert.note ? alert.note : undefined,
            image: alert.image ? alert.image : undefined,
            resolvedAt: alert.resolvedAt ? alert.resolvedAt : undefined,
        }
    }
}