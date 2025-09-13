import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./user.entity";
import { InventorySessionUnit } from "./inventory-session-unit.entity";
import { InventorySessionStatus } from "src/common/shared/InventorySessionStatus";
import { FileUrl } from "./file-url.entity";
import { InventorySessionMember } from "./inventory-session-member.entity";
import { InventorySub } from "./inventory-sub.entity";

@Entity("inventory_sessions")
export class InventorySession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "Năm" })
  year: number;

  @Column({ comment: "Tên kỳ kiểm kê, ví dụ: Kiểm kê cuối năm" })
  name: string;

  @Column({ comment: "Đợt" })
  period: number;

  @Column({
    name: "isGlobal",
    default: false,
    comment:
      "true: Một kỳ cho toàn bộ các đơn vị sử dụng, false: Một kì cho một đơn vị sử dụng",
  })
  isGlobal: boolean;

  @Column({
    name: "startDate",
    type: "date",
    comment: "Ngày bắt đầu",
  })
  startDate: Date;

  @Column({
    name: "endDate",
    type: "date",
    comment: "Ngày kết thúc",
  })
  endDate: Date;

  @Column({
    type: "enum",
    enum: InventorySessionStatus,
    default: InventorySessionStatus.PLANNED,
    comment: "Trạng thái kỳ kiểm kê",
  })
  status: InventorySessionStatus;

  @Column({ name: "createdBy", comment: "Người tạo" })
  createdBy: string;

  @CreateDateColumn({ name: "createdAt" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deletedAt" })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.createdInventorySessions)
  @JoinColumn({ name: "createdBy" })
  creator: User;

  @OneToMany(
    () => InventorySessionUnit,
    (inventorySessionUnit) => inventorySessionUnit.inventorySession
  )
  inventorySessionUnits?: InventorySessionUnit[];

  @ManyToMany(() => FileUrl, { cascade: true })
  @JoinTable({
    name: "file_url_inventory_sessions",
    joinColumn: { name: "inventorySessionId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "fileUrlId", referencedColumnName: "id" },
  })
  fileUrls?: FileUrl[];

  @OneToMany(() => InventorySessionMember, (member) => member.inventorySession)
  members?: InventorySessionMember[];
}
