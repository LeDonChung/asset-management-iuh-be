import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { InventoryGroupAssignment } from "./inventory-group-assignment";
import { InventorySub } from "./inventory-sub.entity";
import { InventoryGroupMember } from "./inventory-group-member.entity";
import { InventoryGroupStatus } from "src/common/shared/InventoryGroupStatus";

@Entity("inventory_groups")
export class InventoryGroup {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "Tên nhóm kiểm kê" })
  name: string;

  @Column({ comment: "ID của tiểu ban" })
  subInventoryId: string;

  @Column({
    type: "enum",
    enum: InventoryGroupStatus,
    default: InventoryGroupStatus.PLANNED,
    comment: "Trạng thái nhóm"
  })
  status: InventoryGroupStatus;

  @Column({ nullable: true, comment: "Mô tả nhóm" })
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
  @ManyToOne(() => InventorySub, (sub) => sub.groups)
  @JoinColumn({ name: "subInventoryId" })
  subInventory?: InventorySub;

  @OneToMany(() => InventoryGroupMember, (member) => member.group)
  members?: InventoryGroupMember[];

  @OneToMany(() => InventoryGroupAssignment, (assignment) => assignment.group)
  assignments?: InventoryGroupAssignment[];
}
