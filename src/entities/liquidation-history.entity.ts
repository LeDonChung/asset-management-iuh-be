import { LiquidationStatus } from "src/common/shared/LiquidationStatus";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { LiquidationProposal } from "./liquidation.entity";
import { User } from "./user.entity";
@Entity("liquidation_histories")
export class LiquidationHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "proposal_id", comment: "Đề xuất liên quan" })
  proposalId: string;

  @Column({ name: "handler_id", comment: "Người xử lý" })
  handlerId: string;

  @Column({
    name: "action_status",
    type: "enum",
    enum: LiquidationStatus,
    comment: "Trạng thái sau khi xử lý",
  })
  actionStatus: LiquidationStatus;

  @Column({
    name: "evidence_url",
    nullable: true,
    comment: "Đường dẫn minh chứng (nếu có)",
  })
  evidenceUrl?: string;

  @Column({ type: "text", nullable: true, comment: "Ghi chú" })
  note?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "updated_at", type: "timestamp", nullable: true })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => LiquidationProposal, (proposal) => proposal.histories)
  @JoinColumn({ name: "proposal_id" })
  proposal: LiquidationProposal;

  @ManyToOne(() => User)
  @JoinColumn({ name: "handler_id" })
  handler: User;
}
