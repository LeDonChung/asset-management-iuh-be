import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
    TableInheritance,
    ChildEntity,
    OneToMany,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';
import { Room } from './room.entity';
import { RfidTag } from './rfid-tag.entity';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';
import { InventoryResult } from './inventory-result';
import { AssetBookItem } from './asset-book-item.entity';
import { Alert } from './alert.entity';


@Entity('assets')
@TableInheritance({
    column: {
        type: 'varchar',
        name: 'type',
        default: 'FIXED_ASSET'
    }
})
export class Asset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'kt_code', comment: 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00)' })
    ktCode: string;

    @Column({ name: 'fixed_code', comment: 'Mã tài sản cố định xxxx.yyyy' })
    fixedCode: string;

    @Column({ nullable: false, comment: 'Tên tài sản' })
    name: string;

    @Column({ nullable: true, comment: 'Thông số kĩ thuật' })
    specs: string;

    @Column({ type: 'date', nullable: false, comment: 'Ngày nhập' })
    entrydate: Date;

    @Column({ name: 'current_room_id', nullable: true, comment: 'Mã vị trí hiện tại' })
    currentRoomId: string;

    @Column({ nullable: false, comment: 'Đơn vị tính' })
    unit: string;

    @Column({ default: 1, comment: 'Số lượng: Với tài sản cố định = 1' })
    quantity: number;

    @Column({ nullable: true, comment: 'Xuất xứ' })
    origin: string;

    @Column({ name: 'purchase_package', nullable: false, default: 0, comment: 'Gói mua' })
    purchasePackage: number;

    @Column({
        type: 'enum',
        enum: AssetType,
        nullable: false,
        comment: 'Loại tài sản',
    })
    type: AssetType;

    @Column({ name: 'category_id', nullable: false, comment: 'Danh mục - 4: máy tính, 3: thiết bị văn phòng, 5: máy in' })
    categoryId: string;

    @Column({
        type: 'enum',
        enum: AssetStatus,
        default: AssetStatus.WAITING_ALLOCATION,
        comment: 'Trạng thái tài sản',
    })
    status: AssetStatus;

    @Column({ name: 'allow_move', default: true, comment: 'Cho phép di chuyển' })
    allowMove: boolean;

    @Column({ name: 'created_by', nullable: false, comment: 'User who initiated the handover' })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;

    // Relationships
    @ManyToOne(() => Category, (category) => category.assets)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @ManyToOne(() => User, (user) => user.createdAssets)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @ManyToOne(() => Room, (room) => room.assets)
    @JoinColumn({ name: 'current_room_id' })
    currentRoom: Room;

    @OneToMany(() => InventoryResult, (result) => result.asset)
    inventoryResults?: InventoryResult[];

    @OneToMany(() => AssetBookItem, (item) => item.asset)
    assetBookItems?: AssetBookItem[];

    @OneToMany(() => Alert, (alert) => alert.asset)
    alerts?: Alert[];
}

// Child entities for inheritance
@ChildEntity('FIXED_ASSET')
export class FixedAsset extends Asset {
    constructor() {
        super();
        this.type = AssetType.FIXED_ASSET;
    }

    @OneToOne(() => RfidTag, (rfidTag) => rfidTag.asset)
    rfidTag?: RfidTag;
}

@ChildEntity('TOOLS_EQUIPMENT')
export class ToolsEquipment extends Asset {
    constructor() {
        super();
        this.type = AssetType.TOOLS_EQUIPMENT;
    }
}
