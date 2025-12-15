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
import { Room } from "./room.entity";
import { User } from "./user.entity";
import { AssetMovement } from "./asset-movement.entity";

@Entity("asset_movement_items")
export class AssetMovementItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "movement_id" })
  movementId: string;

  @Column({ name: "asset_id" })
  assetId: string;

  @Column({ name: "from_room_id", nullable: false })
  fromRoomId: string;

  @Column({ name: "to_room_id", nullable: false })
  toRoomId: string;

  @Column({ type: "int", default: 1, comment: "Số lượng tài sản di chuyển" })
  quantity: number;

  @Column({ type: "text", nullable: true })
  note?: string;

  @Column({
    name: "moved_at",
    nullable: true,
    comment: "Thời gian thực hiện di chuyển",
  })
  movedAt?: Date;

  @Column({
    name: "moved_by",
    nullable: true,
    comment: "Người thực hiện di chuyển",
  })
  movedBy?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  /** Relationships **/
  @ManyToOne(() => AssetMovement, (movement) => movement.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "movement_id" })
  movement: AssetMovement;

  @ManyToOne(() => Asset, (asset) => asset.movementItems)
  @JoinColumn({ name: "asset_id" })
  asset: Asset;

  @ManyToOne(() => Room, (room) => room.fromMovements)
  @JoinColumn({ name: "from_room_id" })
  fromRoom: Room;

  @ManyToOne(() => Room, (room) => room.toMovements)
  @JoinColumn({ name: "to_room_id" })
  toRoom: Room;

  @ManyToOne(() => User, (user) => user.movedAssetItems, { nullable: true })
  @JoinColumn({ name: "moved_by" })
  mover?: User;
}
