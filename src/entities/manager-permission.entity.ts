import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Permission } from "./permission.entity";

@Entity("manager_permissions")
export class ManagerPermission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToMany(() => Permission)
  @JoinTable({
    name: "manager_permission_permissions",
    joinColumn: { name: "managerPermissionId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permissionId", referencedColumnName: "id" },
  })
  permissions?: Permission[];
}
