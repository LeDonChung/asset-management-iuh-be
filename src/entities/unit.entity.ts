import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum UnitStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum UnitType {
  CAMPUS = "Campus",
  PLANNING_INVESTMENT_DEPT = "Planning and Investment Department",
  ADMINISTRATION_DEPT = "Administration Department",
  USER_DEPT = "User Department",
}

@Entity("units")
export class Unit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({
    type: "enum",
    enum: UnitType,
  })
  type: UnitType;

  @Column({ nullable: true })
  representativeId?: string;

  @Column({
    type: "enum",
    enum: UnitStatus,
    default: UnitStatus.ACTIVE,
  })
  status: UnitStatus;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: "representativeId" })
  representative?: User;

  @OneToMany(() => User, (user) => user.unit)
  users?: User[];
}
