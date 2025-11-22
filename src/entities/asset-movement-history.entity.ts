import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { MoveStatus } from "src/common/shared/MoveStatus";
import { User } from "./user.entity";
import { AssetMovement } from "./asset-movement.entity";

@Entity("asset_movement_histories")
export class AssetMovementHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "movement_id" })
  movementId: string;

  @Column({
    name: "old_status",
    type: "enum",
    enum: MoveStatus,
    nullable: true,
  })
  oldStatus: MoveStatus | null;

  @Column({
    name: "new_status",
    type: "enum",
    enum: MoveStatus,
  })
  newStatus: MoveStatus;

  @Column({
    name: "evidence_url",
    nullable: true,
    comment: "Đường dẫn minh chứng (nếu có)",
  })
  evidenceUrl?: string;

  @Column({ name: "changed_by" })
  changedBy: string;

  @Column({ type: "text", nullable: true })
  note?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** Relationships **/
  @ManyToOne(() => AssetMovement, (movement) => movement.histories, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "movement_id" })
  movement: AssetMovement;

  @ManyToOne(() => User, (user) => user.movementHistories)
  @JoinColumn({ name: "changed_by" })
  changer: User;
}
