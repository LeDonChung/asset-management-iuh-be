import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Unit } from './unit.entity';
import { Room } from './room.entity';
import { User } from './user.entity';
import { TransactionType } from 'src/common/shared/TransactionType';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { AssetTransactionItem } from './asset-transaction-item.entity';
import { AssetTransactionHistory } from './asset-transaction-history.entity';

@Entity('asset_transactions')
export class AssetTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: TransactionType,
        nullable: false,
        comment: 'Loại giao dịch',
    })
    type: TransactionType;

    @Column({ name: 'from_unit_id', nullable: true, comment: 'Đơn vị bàn giao (null nếu allocation)' })
    fromUnitId?: string;

    @Column({ name: 'to_unit_id', nullable: false, comment: 'Đơn vị tiếp nhận' })
    toUnitId: string;

    @Column({ name: 'requester_id', nullable: false, comment: 'Người yêu cầu' })
    requesterId: string;

    @Column({ name: 'approver_id', nullable: true, comment: 'Người phê duyệt (phòng quản trị)' })
    approverId?: string;

    @Column({ name: 'handover_id', nullable: true, comment: 'Người bàn giao' })
    handoverId?: string;

    @Column({ name: 'receiver_id', nullable: true, comment: 'Người tiếp nhận' })
    receiverId?: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.DRAFT,
        comment: 'Trạng thái',
    })
    status: TransactionStatus;

    @Column({ name: 'request_note', type: 'text', nullable: true, comment: 'Ghi chú yêu cầu' })
    requestNote?: string;

    @Column({ name: 'approval_note', type: 'text', nullable: true, comment: 'Ghi chú phê duyệt' })
    approvalNote?: string;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true, comment: 'Lý do từ chối' })
    rejectionReason?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;

    // Relationships
    @ManyToOne('Unit', 'fromTransactions')
    @JoinColumn({ name: 'from_unit_id' })
    fromUnit?: Unit;

    @ManyToOne('Unit', 'toTransactions')
    @JoinColumn({ name: 'to_unit_id' })
    toUnit: Unit;

    @ManyToOne('User', 'requestedTransactions')
    @JoinColumn({ name: 'requester_id' })
    requester: User;

    @ManyToOne('User', 'approvedTransactions')
    @JoinColumn({ name: 'approver_id' })
    approver?: User;

    @ManyToOne('User', 'handoverTransactions')
    @JoinColumn({ name: 'handover_id' })
    handover?: User;

    @ManyToOne('User', 'receivedTransactions')
    @JoinColumn({ name: 'receiver_id' })
    receiver?: User;

    @OneToMany(() => AssetTransactionItem, 'transaction', { cascade: true })
    items: AssetTransactionItem[];

    @OneToMany(() => AssetTransactionHistory, 'transaction', { cascade: true })
    histories: AssetTransactionHistory[];
}
