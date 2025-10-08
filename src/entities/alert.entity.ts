export enum AlertStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FALSE_ALARM = 'FALSE_ALARM',
    SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export enum AlertType {
    UNAUTHORIZED_MOVEMENT = 'UNAUTHORIZED_MOVEMENT'
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
    UpdateDateColumn,
    IsNull,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

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

    @Column({ name: 'resolver_id', nullable: true })
    resolverId: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ type: 'text', nullable: true })
    image: string;

    @Column({ name: 'device_id', type: 'text' })
    deviceId: string;

    @Column({ name: 'created_at', type: 'timestamp' })
    @CreateDateColumn()
    createdAt: Date;

    @Column({ name: 'resolved_at', type: 'timestamp' })
    @UpdateDateColumn()
    resolvedAt: Date;

    // Relations
    @ManyToOne(() => Asset, (asset) => asset.alerts)
    @JoinColumn({ name: 'asset_id' })
    asset?: Asset;

    @ManyToOne(() => Room, (room) => room.alerts)
    @JoinColumn({ name: 'room_id' })
    room?: Room;

    @ManyToOne(() => User, (user) => user.alerts)
    @JoinColumn({ name: 'resolver_id' })
    resolver?: User;
}