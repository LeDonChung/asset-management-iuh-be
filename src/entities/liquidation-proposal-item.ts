import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Asset } from "./asset.entity";
import { LiquidationProposal } from "./liquidation.entity";
@Entity("liquidation_proposal_items")
export class LiquidationProposalItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "proposal_id", comment: "Đề xuất thanh lý liên quan" })
  proposalId: string;

  @Column({ name: "asset_id", comment: "Tài sản / công cụ dụng cụ" })
  assetId: string;

  @Column({
    name: "system_quantity",
    type: "int",
    comment: "Số lượng theo sổ sách",
  })
  systemQuantity: number;

  @Column({
    name: "counted_quantity",
    type: "int",
    comment: "Số lượng theo kiểm kê",
  })
  countedQuantity: number;

  @Column({ type: "text", nullable: true, comment: "Ghi chú thêm" })
  note?: string;

  @Column({
    name: "image_url",
    nullable: true,
    comment: "Đường dẫn hình ảnh minh chứng (nếu có)",
  })
  imageUrl?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => LiquidationProposal, (proposal) => proposal.items)
  @JoinColumn({ name: "proposal_id" })
  proposal: LiquidationProposal;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset: Asset;
}
