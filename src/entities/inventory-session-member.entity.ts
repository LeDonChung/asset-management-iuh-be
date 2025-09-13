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
import { InventorySession } from "./inventory-session.entity";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

@Entity("inventory_session_members")
@Index(["inventorySessionId", "userId"], { unique: true })
export class InventorySessionMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "ID của user tham gia" })
  userId: string;

  @Column({ comment: "ID của kỳ kiểm kê" })
  inventorySessionId: string;

  @Column({
    type: "enum",
    enum: CommitteeRole,
    default: CommitteeRole.MEMBER,
    comment: "Vai trò trong kỳ kiểm kê"
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

  @ManyToOne(() => InventorySession, (session) => session.members)
  @JoinColumn({ name: "inventorySessionId" })
  inventorySession: InventorySession;
}
