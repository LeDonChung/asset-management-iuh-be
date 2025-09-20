import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Unit } from "./unit.entity";
import { AssetBookItem } from "./asset-book-item.entity";

@Entity("asset_books")
export class AssetBook {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    unitId: string;

    @Column()
    year: number;

    @Column({ nullable: true })
    lookedAt?: Date;

    @ManyToOne(() => Unit, (unit) => unit.assetBooks)
    @JoinColumn({ name: "unitId" })
    unit: Unit;

    @Column({
        type: "enum",
        enum: AssetBookStatus,
        default: AssetBookStatus.OPEN,
    })
    status: AssetBookStatus;

    @OneToMany(() => AssetBookItem, (item) => item.book)
    items?: AssetBookItem[];
}