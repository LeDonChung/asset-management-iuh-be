export enum AlertStatus {
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED'
}

export enum AlertType {
    UNAUTHORIZED_MOVEMENT = 'UNAUTHORIZED_MOVEMENT'
}

export enum AlertResolutionStatus {
    CONFIRMED = 'CONFIRMED',
    FALSE_ALARM = 'FALSE_ALARM',
    SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export enum DamageReportStatus {
    REPORTED = 'REPORTED',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    OneToOne,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Room } from './room.entity';
import { AlertResolution } from './alert-resolution.entity';

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'asset_id' })
    assetId: string;

    @Column({ name: 'room_id' })
    roomId: string;

    @Column({
        type: 'enum',
        enum: AlertType,
        default: AlertType.UNAUTHORIZED_MOVEMENT,
    })
    type: AlertType;

    @Column({
        type: 'enum',
        enum: AlertStatus,
        default: AlertStatus.PENDING,
    })
    status: AlertStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Asset, (asset) => asset.alerts)
    @JoinColumn({ name: 'asset_id' })
    asset?: Asset;

    @ManyToOne(() => Room, (room) => room.alerts)
    @JoinColumn({ name: 'room_id' })
    room?: Room;

    @OneToOne(() => AlertResolution, (resolution) => resolution.alert)
    resolution?: AlertResolution;
}