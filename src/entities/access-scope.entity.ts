import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Unit } from "./unit.entity";

export enum AccessScopeType {
  GLOBAL = 'GLOBAL',           // Toàn hệ thống
  UNIT = 'UNIT',              // Chỉ unit được chỉ định
  CHILD_UNITS = 'CHILD_UNITS', // Unit và các unit con
  SELF = 'SELF'               // Chỉ dữ liệu của chính mình
}

@Entity("access_scopes")
export class AccessScope {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: AccessScopeType,
  })
  type: AccessScopeType;

  @Column({ nullable: true, comment: "Unit ID khi type là UNIT hoặc CHILD_UNITS" })
  unitId?: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Unit, { nullable: true })
  @JoinColumn({ name: "unitId" })
  unit?: Unit;
}
