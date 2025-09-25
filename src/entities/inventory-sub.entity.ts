import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { InventoryGroup } from "./inventory-group";
import { InventorySessionUnit } from "./inventory-session-unit.entity";
import { SubInventoryMember } from "./sub-inventory-member.entity";
import { InventorySubStatus } from "src/common/shared/InventorySubStatus";

@Entity("inventory_subs")
export class InventorySub {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ comment: "Tên tiểu ban kiểm kê" })
    name: string;

    @Column({ comment: "ID của cơ sở tham gia" })
    inventorySessionUnitId: string;

    @Column({
        type: "enum",
        enum: InventorySubStatus,
        default: InventorySubStatus.PLANNED,
        comment: "Trạng thái tiểu ban"
    })
    status: InventorySubStatus;

    @Column({ nullable: true, comment: "Mô tả tiểu ban" })
    description?: string;

    @Column({ nullable: true, comment: "Người tạo" })
    createdBy?: string;

    @CreateDateColumn({ name: "createdAt" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updatedAt" })
    updatedAt: Date;

    @DeleteDateColumn({ name: "deletedAt" })
    deletedAt?: Date;

    // Relations
    @OneToOne(() => InventorySessionUnit, (unit) => unit.subInventory)
    @JoinColumn({ name: "inventorySessionUnitId" })
    inventorySessionUnit?: InventorySessionUnit;

    @OneToMany(() => SubInventoryMember, (member) => member.subInventory)
    members?: SubInventoryMember[];

    @OneToMany(() => InventoryGroup, (group) => group.subInventory)
    groups?: InventoryGroup[];
}
