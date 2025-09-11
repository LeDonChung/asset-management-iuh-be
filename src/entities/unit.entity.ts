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
import { UnitType } from "src/common/shared/UnitType";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { Room } from "./room.entity";
import { Expose } from "class-transformer";

@Entity("units")
export class Unit {
  @PrimaryGeneratedColumn("uuid")
  @Expose()
  id: string;

  @Column()
  @Expose()
  name: string;

  @Column({ unique: true })
  @Expose()
  unitCode: number; // y -> automatic generation from count of units

  @Column({ nullable: true })
  @Expose()
  phone?: string;

  @Column({ nullable: true })
  @Expose()
  email?: string;

  @Column({
    type: "enum",
    enum: UnitType,
  })
  @Expose()
  type: UnitType;

  @Column({ nullable: true })
  representativeId?: string;

  @Column({
    type: "enum",
    enum: UnitStatus,
    default: UnitStatus.ACTIVE,
  })
  @Expose()
  status: UnitStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdBy" })
  createdBy?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "representativeId" })
  @Expose()
  representative?: User;

  @OneToMany(() => User, (user) => user.unit)
  @Expose()
  users?: User[];

  @OneToMany(() => Room, (room) => room.unit)
  @Expose()
  rooms?: Room[];
}
