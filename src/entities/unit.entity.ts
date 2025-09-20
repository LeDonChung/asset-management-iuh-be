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
import { InventorySessionUnit } from "./inventory-session-unit.entity";
import { InventoryGroupAssignment } from "./inventory-group-assignment";
import { Expose } from "class-transformer";
import { AssetBook } from "./asset-book.entity";

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

  @Column({ nullable: true, comment: "ID của đơn vị cha (null nếu là cơ sở root)" })
  parentUnitId?: string;

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

  // Self-referencing relationship for hierarchy
  @ManyToOne(() => Unit, (unit) => unit.childUnits, { nullable: true })
  @JoinColumn({ name: "parentUnitId" })
  @Expose()
  parentUnit?: Unit;

  @OneToMany(() => Unit, (unit) => unit.parentUnit)
  @Expose()
  childUnits?: Unit[];

  @OneToMany(() => User, (user) => user.unit)
  @Expose()
  users?: User[];

  @OneToMany(() => Room, (room) => room.unit)
  @Expose()
  rooms?: Room[];

  @OneToMany(() => InventorySessionUnit, (inventorySessionUnit) => inventorySessionUnit.unit)
  @Expose()
  inventorySessionUnits?: InventorySessionUnit[];

  @OneToMany(() => InventoryGroupAssignment, (assignment) => assignment.unit)
  @Expose()
  inventoryGroupAssignments?: InventoryGroupAssignment[];

  @OneToMany(() => AssetBook, (assetBook) => assetBook.unit)
  assetBooks?: AssetBook[];
}
