import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { AssetTransaction } from './asset-transaction.entity';
import { Room } from './room.entity';

@Entity('asset_transaction_items')
export class AssetTransactionItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'transaction_id', nullable: false })
    transactionId: string;

    @Column({ name: 'asset_id', nullable: false })
    assetId: string;

    @Column({ name: 'from_room_id', nullable: true, comment: 'Phòng hiện tại của tài sản này' })
    fromRoomId?: string;

    @Column({ name: 'to_room_id', nullable: true, comment: 'Phòng đích cho tài sản này (có thể khác với transaction.toRoomId)' })
    toRoomId?: string;

    @Column({ type: 'int', default: 1, comment: 'Số lượng tài sản bàn giao' })
    quantity: number;

    @Column({ type: 'text', nullable: true, comment: 'Ghi chú cho từng tài sản' })
    note?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => AssetTransaction, (transaction) => transaction.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'transaction_id' })
    transaction: AssetTransaction;

    @ManyToOne(() => Asset, (asset) => asset.transactionItems)
    @JoinColumn({ name: 'asset_id' })
    asset: Asset;

    @ManyToOne(() => Room, (room) => room.fromTransactionItems)
    @JoinColumn({ name: 'from_room_id' })
    fromRoom?: Room;

    @ManyToOne(() => Room, (room) => room.toTransactionItems)
    @JoinColumn({ name: 'to_room_id' })
    toRoom?: Room;
}
