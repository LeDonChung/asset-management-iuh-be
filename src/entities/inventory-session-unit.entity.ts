import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { InventorySession } from './inventory-session.entity';
import { Unit } from './unit.entity';
import { InventorySub } from './inventory-sub.entity';

@Entity('inventory_session_units')
export class InventorySessionUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sessionId', comment: 'ID của kỳ kiểm kê' })
  sessionId: string;

  @Column({ name: 'unitId', comment: 'ID của đơn vị' })
  unitId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt' })
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => InventorySession, (inventorySession) => inventorySession.inventorySessionUnits)
  @JoinColumn({ name: 'sessionId' })
  inventorySession: InventorySession;

  @ManyToOne(() => Unit, (unit) => unit.inventorySessionUnits)
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @OneToOne(() => InventorySub, (sub) => sub.inventorySessionUnit)
  subInventory: InventorySub;
}
