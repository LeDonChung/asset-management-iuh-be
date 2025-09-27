import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    OneToOne,
} from 'typeorm';
import { Alert, AlertResolutionStatus } from './alert.entity';
import { User } from './user.entity';

@Entity('alert_resolutions')
export class AlertResolution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'alert_id' })
    alertId: string;

    @Column({ name: 'resolver_id' })
    resolverId: string;

    @Column({
        type: 'enum',
        enum: AlertResolutionStatus,
    })
    resolution: AlertResolutionStatus;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ name: 'resolved_at', type: 'timestamp' })
    @CreateDateColumn()
    resolvedAt: Date;

    // Relations
    @OneToOne(() => Alert, (alert) => alert.resolution)
    @JoinColumn({ name: 'alert_id' })
    alert: Alert;

    @ManyToOne(() => User, (user) => user.alertResolutions)
    @JoinColumn({ name: 'resolver_id' })
    resolver?: User;
}