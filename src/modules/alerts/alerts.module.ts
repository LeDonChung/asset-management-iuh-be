import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../../entities/alert.entity';
import { Asset } from 'src/entities/asset.entity';
import { User } from 'src/entities/user.entity';
import { Room } from 'src/entities/room.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Alert, Asset, User, Room])
    ],
    controllers: [AlertsController],
    providers: [AlertsService],
    exports: [AlertsService]
})
export class AlertsModule { }