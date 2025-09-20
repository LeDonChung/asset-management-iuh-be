import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from "typeorm";
import { InventoryGroup } from "./inventory-group";
import { Unit } from "./unit.entity";
import { InventoryResult } from "./inventory-result";

@Entity("inventory_group_assignments")
export class InventoryGroupAssignment {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ comment: "ID của nhóm kiểm kê" })
    groupId: string;

    @Column({ comment: "ID của đơn vị sử dụng (USER_DEPT)" })
    unitId: string;

    @Column({ type: "date", comment: "Ngày bắt đầu phân công" })
    startDate: Date;

    @Column({ type: "date", comment: "Ngày kết thúc phân công" })
    endDate: Date;

    @Column({ nullable: true, comment: "Ghi chú" })
    note?: string;

    @Column({ nullable: true, comment: "Người tạo" })
    createdBy?: string;

    @CreateDateColumn({ name: "createdAt" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updatedAt" })
    updatedAt: Date;

    @DeleteDateColumn({ name: "deletedAt" })
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => InventoryGroup, (group) => group.assignments)
    @JoinColumn({ name: "groupId" })
    group: InventoryGroup;

    @ManyToOne(() => Unit, (unit) => unit.inventoryGroupAssignments)
    @JoinColumn({ name: "unitId" })
    unit: Unit;

    @OneToMany(() => InventoryResult, (result) => result.assignment)
    results?: InventoryResult[];
}