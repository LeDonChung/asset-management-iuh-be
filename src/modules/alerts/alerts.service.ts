import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset } from "src/entities/asset.entity";
import { Room } from "src/entities/room.entity";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { Alert, AlertStatus, AlertType } from "src/entities/alert.entity";
import { CreateAlertResolutionDto } from "./dto/create-alert-resolution.dto";
import { AlertResolution } from "src/entities/alert-resolution.entity";

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
        @InjectRepository(AlertResolution)
        private readonly alertResolutionRepository: Repository<AlertResolution>,
    ) { }

    async create(createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
        try {
            const { assetId, roomId } = createAlertDto;
            // kiểm tra assetId và roomId có tồn tại trong database không
            const asset = await this.assetRepository.findOne({ where: { id: assetId } });
            const room = await this.roomRepository.findOne({ where: { id: roomId } });

            if (!asset || !room) {
                throw new Error("Asset or Room not found");
            }

            // Nếu cả asset và room đều tồn tại, tiến hành tạo alert
            const alert = this.alertRepository.create({
                assetId: asset.id,
                roomId: room.id,
                type: AlertType.UNAUTHORIZED_MOVEMENT,
                status: AlertStatus.PENDING,
            });

            const savedAlert = await this.alertRepository.save(alert);
            console.log('savedAlert', savedAlert);

            return this.transformToResponseDto(savedAlert);
        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    async findAll(): Promise<AlertResponseDto[]> {
        try {
            const alerts = await this.alertRepository.find({
                relations: ['asset', 'room', 'resolution'],
                order: { createdAt: 'DESC' },
            });
            return alerts.map(alert => this.transformToResponseDto(alert));
        } catch (error) {
            console.error('Error fetching alerts:', error);
            throw error;
        }
    }

    async createAlertResolution(createResolution: CreateAlertResolutionDto, currentUser: User): Promise<AlertResponseDto> {
        try {
            const { alertId, resolution, note } = createResolution;
            const alert = await this.alertRepository.findOne({ 
                where: { id: alertId }, 
                relations: ['resolution', 'asset', 'room'] 
            });
            
            if (!alert) {
                throw new Error("Alert not found");
            }

            const alertResolution = this.alertResolutionRepository.create({
                alertId: alert.id,
                resolverId: currentUser.id,
                resolution,
                note,
            });
            
            const savedAlertResolution = await this.alertResolutionRepository.save(alertResolution);

            alert.status = AlertStatus.RESOLVED;
            alert.resolution = savedAlertResolution;
            await this.alertRepository.save(alert);

            return this.transformToResponseDto(alert);
        } catch (error) {
            console.error('Error creating alert resolution:', error);
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
            resolution: alert.resolution ? {
                id: alert.resolution.id,
                note: alert.resolution.note,
                resolvedAt: alert.resolution.resolvedAt,
                resolution: alert.resolution.resolution,
            } : undefined,
        }
    }
}