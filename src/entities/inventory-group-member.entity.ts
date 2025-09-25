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
import { InventoryGroup } from "./inventory-group";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

@Entity("inventory_group_members")
@Index(["groupId", "userId"], { unique: true })
export class InventoryGroupMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "ID của user tham gia nhóm" })
  userId: string;

  @Column({ comment: "ID của nhóm kiểm kê" })
  groupId: string;

  @Column({
    type: "enum",
    enum: CommitteeRole,
    default: CommitteeRole.MEMBER,
    comment: "Vai trò trong nhóm"
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

  @ManyToOne(() => InventoryGroup, (group) => group.members)
  @JoinColumn({ name: "groupId" })
  group: InventoryGroup;
}
