import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AssetBook } from "./asset-book.entity";
import { Room } from "./room.entity";
import { Asset } from "./asset.entity";

@Entity("asset_book_items")
export class AssetBookItem {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    bookId: string;

    @Column()
    roomId: string;

    @Column()
    assetId: string;

    @Column()
    assignedAt: Date;

    @Column()
    quantity: number;

    @Column({
        type: "enum",
        enum: AssetBookItemStatus,
        default: AssetBookItemStatus.IN_USE,
    })
    status: AssetBookItemStatus;

    @Column()
    note: string;

    @ManyToOne(() => AssetBook, (book) => book.items)
    @JoinColumn({ name: "bookId" })
    book: AssetBook;

    @ManyToOne(() => Room, (room) => room.assetBookItems)
    @JoinColumn({ name: "roomId" })
    room: Room;

    @ManyToOne(() => Asset, (asset) => asset.assetBookItems)
    @JoinColumn({ name: "assetId" })
    asset: Asset;
}