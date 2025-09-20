import { InventoryResultStatus } from "src/common/shared/InventoryResultStatus";
import { ScanMethod } from "src/common/shared/ScanMethod";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { InventoryGroupAssignment } from "./inventory-group-assignment";
import { Asset } from "./asset.entity";

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

    @Column({ comment: "Số lượng thực tế kiểm kê" })
    countedQuantity: number;

    @Column({ comment: "Phương pháp quét" })
    scanMethod: ScanMethod;

    @Column({ comment: "Trạng thái" })
    status: InventoryResultStatus;

    @Column({ comment: "Ghi chú" })
    note: string;

    @Column({ comment: "Người tạo" })
    createdBy: string;

    @Column({ comment: "Ngày tạo" })
    createdAt: Date;

    @Column({ comment: "Ngày cập nhật" })
    updatedAt: Date;

    @Column({ comment: "Ngày xóa" })
    deletedAt: Date;

    @ManyToOne(() => InventoryGroupAssignment, (assignment) => assignment.results)
    @JoinColumn({ name: "assignmentId" })
    assignment: InventoryGroupAssignment;

    @ManyToOne(() => Asset, (asset) => asset.inventoryResults)
    @JoinColumn({ name: "assetId" })
    asset: Asset;
}