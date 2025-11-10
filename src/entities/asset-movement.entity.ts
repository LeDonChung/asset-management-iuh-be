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
  } from 'typeorm';
  import { User } from './user.entity';
  import { Room } from './room.entity';
  import { MoveStatus } from 'src/common/shared/MoveStatus';
import { AssetMovementItem } from './asset-movement-item.entity';
import { AssetMovementHistory } from './asset-movement-history.entity';
  
  @Entity('asset_movements')
  export class AssetMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'requester_id', nullable: false })
    requesterId: string;
  
    @Column({ name: 'approver_id', nullable: true })
    approverId?: string;
  
  @Column({
    type: 'enum',
    enum: MoveStatus,
    default: MoveStatus.PENDING_APPROVAL,
  })
  status: MoveStatus;
  
    @Column({ type: 'text', nullable: true, comment: 'Ghi chú của người yêu cầu' })
    requestNote?: string;
  
    @Column({ type: 'text', nullable: true, comment: 'Ghi chú phê duyệt' })
    approvalNote?: string;
  
  @Column({ type: 'text', nullable: true, comment: 'Lý do từ chối' })
  rejectionReason?: string;

  @Column({ name: 'approved_at', nullable: true, comment: 'Thời gian phê duyệt' })
  approvedAt?: Date;

  @Column({ name: 'completed_at', nullable: true, comment: 'Thời gian hoàn thành di chuyển' })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true, comment: 'Thời gian hủy bỏ' })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;
  
    /** Relationships **/
    @ManyToOne(() => User, (user) => user.requestedMovements)
    @JoinColumn({ name: 'requester_id' })
    requester: User;
  
    @ManyToOne(() => User, (user) => user.approvedMovements)
    @JoinColumn({ name: 'approver_id' })
    approver?: User;
  
    @OneToMany(() => AssetMovementItem, (item) => item.movement, {
      cascade: true,
    })
    items: AssetMovementItem[];
  
    @OneToMany(() => AssetMovementHistory, (history) => history.movement, {
      cascade: true,
    })
    histories: AssetMovementHistory[];
  }
  