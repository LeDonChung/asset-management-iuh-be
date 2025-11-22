import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    ManyToMany,
    JoinTable,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { Unit } from './unit.entity';
import { Asset } from './asset.entity';
import { InventorySession } from './inventory-session.entity';
import { Alert } from './alert.entity';
import { AssetMovement } from './asset-movement.entity';
import { AssetMovementHistory } from './asset-movement-history.entity';
import { AssetMovementItem } from './asset-movement-item.entity';

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    LOCKED = 'LOCKED',
    DELETED = 'DELETED',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    @Column()
    fullName: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    unitId?: string;

    @Column({ nullable: true })
    phoneNumber?: string;

    @Column({ type: 'date', nullable: true })
    birthDate?: string;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE,
    })
    status: UserStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToMany(() => Role, (role) => role.users)
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'userId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
    })
    roles?: Role[];

    @ManyToOne(() => Unit, (unit) => unit.users)
    @JoinColumn({ name: 'unitId' })
    unit?: Unit;

    @OneToMany(() => Asset, (asset) => asset.creator)
    createdAssets?: Asset[];

    @OneToMany(() => InventorySession, (inventorySession) => inventorySession.creator)
    createdInventorySessions?: InventorySession[];

    @OneToMany(() => Alert, (alert) => alert.resolver)
    alerts?: Alert[];

    // Asset Transaction relationships
    @OneToMany('AssetTransaction', 'requester')
    requestedTransactions?: any[];

    @OneToMany('AssetTransaction', 'approver')
    approvedTransactions?: any[];

    @OneToMany('AssetTransaction', 'handover')
    handoverTransactions?: any[];

    @OneToMany('AssetTransaction', 'receiver')
    receivedTransactions?: any[];

    @OneToMany('AssetTransactionHistory', 'changer')
    transactionHistories?: any[];

    // Asset Movement relationships
    @OneToMany(() => AssetMovement, (movement) => movement.requester)
    requestedMovements?: AssetMovement[];

    @OneToMany(() => AssetMovement, (movement) => movement.approver)
    approvedMovements?: AssetMovement[];

    @OneToMany(() => AssetMovementHistory, (history) => history.changer)
    movementHistories?: AssetMovementHistory[];

    @OneToMany(() => AssetMovementItem, (item) => item.mover)
    movedAssetItems?: AssetMovementItem[];
}
