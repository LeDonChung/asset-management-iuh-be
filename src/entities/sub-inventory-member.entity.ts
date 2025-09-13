import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { InventorySub } from "./inventory-sub.entity";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

@Entity("sub_inventory_members")
@Index(["subInventoryId", "userId"], { unique: true })
export class SubInventoryMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "ID của user tham gia tiểu ban" })
  userId: string;

  @Column({ comment: "ID của tiểu ban" })
  subInventoryId: string;

  @Column({
    type: "enum",
    enum: CommitteeRole,
    default: CommitteeRole.MEMBER,
    comment: "Vai trò trong tiểu ban"
  })
  role: CommitteeRole;

  @Column({ nullable: true, comment: "Ghi chú thêm" })
  notes?: string;

  @Column({ nullable: true, comment: "Người tạo" })
  createdBy?: string;

  @CreateDateColumn({ name: "createdAt" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deletedAt" })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => InventorySub, (sub) => sub.members)
  @JoinColumn({ name: "subInventoryId" })
  subInventory: InventorySub;
}
