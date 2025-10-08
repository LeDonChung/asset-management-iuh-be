import { InventoryResultStatus } from "src/common/shared/InventoryResultStatus";
import { ScanMethod } from "src/common/shared/ScanMethod";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { InventoryGroupAssignment } from "./inventory-group-assignment";
import { Asset } from "./asset.entity";
import { FileUrl } from "./file-url.entity";
import { Room } from "./room.entity";
import { Expose } from "class-transformer";

@Entity("inventory_results")
export class InventoryResult {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ comment: "Số lượng trên hệ thống" })  
    systemQuantity: number;

    @Column({ comment: "ID của tài sản" })
    assetId: string;

    @Column({ comment: "ID của phân công kiểm kê" })
    assignmentId: string;

    @Column({ comment: "ID của phòng" })
    roomId: string;

    @Column({ comment: "Số lượng thực tế kiểm kê" })
    countedQuantity: number;

    @Column({ comment: "Phương pháp quét" })
    scanMethod: ScanMethod;

    @Column({ comment: "Trạng thái" })
    status: InventoryResultStatus;

    @Column({ comment: "Ghi chú" })
    note: string;

    @ManyToMany(() => FileUrl, { cascade: true })
    @JoinTable({
        name: "file_url_inventory_results",
        joinColumn: { name: "inventoryResultId", referencedColumnName: "id" },
        inverseJoinColumn: { name: "fileUrlId", referencedColumnName: "id" },
    })
    fileUrls?: FileUrl[];

    @Column({ comment: "Người tạo" })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    @ManyToOne(() => InventoryGroupAssignment, (assignment) => assignment.results)
    @JoinColumn({ name: "assignmentId" })
    assignment: InventoryGroupAssignment;

    @ManyToOne(() => Asset, (asset) => asset.inventoryResults)
    @JoinColumn({ name: "assetId" })
    @Expose()
    asset: Asset;

    @ManyToOne(() => Room, (room) => room.inventoryResults)
    @JoinColumn({ name: "roomId" })
    @Expose()
    room: Room;
}