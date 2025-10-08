import { RoomStatus } from "src/common/shared/RoomStatus";
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Unique,
    OneToMany,
    ManyToMany,
    JoinTable,
} from "typeorm";
import { Unit } from "./unit.entity";
import { User } from "./user.entity";
import { Asset } from "./asset.entity";
import { AssetBookItem } from "./asset-book-item.entity";
import { InventoryResult } from "./inventory-result";
import { Alert } from "./alert.entity";

@Entity("rooms")
@Unique("unique_room_location", ["building", "floor", "roomNumber", "unitId"])
export class Room {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column()
    building: string;

    @Column({ type: "varchar", length: 100, unique: true })
    roomCode: string; //xyzz.nn => x->unit, y->building, zz->floor, nn->roomNumber

    @Column()
    floor: string;

    @Column()
    roomNumber: string;

    @ManyToMany(() => Room, (room) => room.adjacentRooms)
    @JoinTable({
        name: 'room_adjacent_rooms',
        joinColumn: { name: 'roomId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'adjacentRoomId', referencedColumnName: 'id' }
    })
    adjacentRooms: Room[];

    @Column({
        type: "enum",
        enum: RoomStatus,
        default: RoomStatus.ACTIVE,
    })
    status: RoomStatus;

    @Column({ nullable: true })
    unitId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => Unit, { nullable: true })
    @JoinColumn({ name: "unitId" })
    unit?: Unit;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "createdBy" })
    createdBy?: User;

    @OneToMany(() => Asset, (asset) => asset.currentRoom)
    assets?: Asset[];

    @OneToMany(() => AssetBookItem, (item) => item.room)
    assetBookItems?: AssetBookItem[];

    @OneToMany(() => InventoryResult, (result) => result.room)
    inventoryResults?: InventoryResult[];

    @OneToMany(() => Alert, (alert) => alert.room)
    alerts?: Alert[];
}
