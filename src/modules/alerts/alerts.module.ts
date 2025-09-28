import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../../entities/alert.entity';
import { AlertResolution } from '../../entities/alert-resolution.entity';
import { Asset } from 'src/entities/asset.entity';
import { User } from 'src/entities/user.entity';
import { Room } from 'src/entities/room.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AssetBook } from 'src/entities/asset-book.entity';
import { RfidTag } from 'src/entities/rfid-tag.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Alert, AlertResolution, Asset, User, Room, AssetBook, AssetBookItem, RfidTag])
    ],
    controllers: [AlertsController],
    providers: [AlertsService],
    exports: [AlertsService]
})
export class AlertsModule { }