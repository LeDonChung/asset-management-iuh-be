import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Unit } from "./unit.entity";
import { LiquidationStatus } from "src/common/shared/LiquidationStatus";
import { LiquidationProposalItem } from "./liquidation-proposal-item";
import { LiquidationHistory } from "./liquidation-history.entity";
import { AssetType } from "src/common/shared/AssetType";

@Entity("liquidation_proposals")
export class LiquidationProposal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "proposer_id", comment: "Người đề xuất" })
  proposerId: string;

  @Column({
    type: "enum",
    enum: AssetType,
    default: AssetType.FIXED_ASSET,
    comment: "Loại tài sản",
  })
  assetType: AssetType;

  @Column({ name: "unit_id", comment: "Đơn vị sử dụng" })
  unitId: string;

  @Column({
    type: "enum",
    enum: LiquidationStatus,
    default: LiquidationStatus.PROPOSED,
    comment: "Trạng thái đề xuất",
  })
  status: LiquidationStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: "proposer_id" })
  proposer: User;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: "unit_id" })
  unit: Unit;

  @OneToMany(() => LiquidationProposalItem, (item) => item.proposal)
  items: LiquidationProposalItem[];

  @OneToMany(() => LiquidationHistory, (history) => history.proposal)
  histories: LiquidationHistory[];
}
