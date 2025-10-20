import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TransactionStatus } from 'src/common/shared/TransactionStatus';
import { AssetTransaction } from './asset-transaction.entity';

@Entity('asset_transaction_histories')
export class AssetTransactionHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'transaction_id', nullable: false, comment: 'ID giao dịch tài sản' })
    transactionId: string;

    @Column({
        name: 'old_status',
        type: 'enum',
        enum: TransactionStatus,
        nullable: false,
        comment: 'Trạng thái giao dịch cũ',
    })
    oldStatus: TransactionStatus;

    @Column({
        name: 'new_status',
        type: 'enum',
        enum: TransactionStatus,
        nullable: false,
        comment: 'Trạng thái giao dịch mới',
    })
    newStatus: TransactionStatus;

    @Column({ name: 'changed_by', nullable: false, comment: 'Người thay đổi' })
    changedBy: string;

    @Column({ type: 'text', nullable: true, comment: 'Ghi chú thay đổi' })
    note?: string;

    @CreateDateColumn({ name: 'created_at', comment: 'Thời gian ghi nhận thay đổi' })
    createdAt: Date;

    // Relationships
    @ManyToOne(() => AssetTransaction, (transaction) => transaction.histories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'transaction_id' })
    transaction: AssetTransaction;

    @ManyToOne(() => User, (user) => user.transactionHistories)
    @JoinColumn({ name: 'changed_by' })
    changer: User;
}