import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { FixedAsset } from './asset.entity';

@Entity('rfid_tags')
export class RfidTag {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'rfid_id', nullable: true, comment: 'E280F3362000F00005E66021' })
  rfidId: string;

  @Column({ name: 'asset_id', nullable: false, unique: true, comment: 'Mã tài sản cố định' })
  assetId: string;

  @Column({ name: 'assigned_date', nullable: false, comment: 'Ngày định danh và đưa vào tài sản' })
  assignedDate: string;

  @OneToOne(() => FixedAsset, (asset) => asset.rfidTag)
  @JoinColumn({ name: 'asset_id' })
  asset: FixedAsset;
}
