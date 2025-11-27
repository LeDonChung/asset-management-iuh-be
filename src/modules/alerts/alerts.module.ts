import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Alert } from "../../entities/alert.entity";
import { Asset } from "src/entities/asset.entity";
import { User } from "src/entities/user.entity";
import { Room } from "src/entities/room.entity";
import { AlertsService } from "./alerts.service";
import { AlertsController } from "./alerts.controller";
import { AssetBook } from "src/entities/asset-book.entity";
import { RfidTag } from "src/entities/rfid-tag.entity";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { MulterModule } from "@nestjs/platform-express";
import { FilesModule } from "../files/files.module";
import { EmailModule } from "../email/email.module";
import { PermissionHelperService } from "src/common/services/permission-helper.service";
import { Unit } from "src/entities/unit.entity";
import { AccessControlModule } from "src/common/services/access-control.module";
import { MovementsModule } from "../movements/movements.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alert,
      Asset,
      User,
      Room,
      AssetBook,
      AssetBookItem,
      RfidTag,
      Unit
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    FilesModule,
    EmailModule,
    AccessControlModule,
    MovementsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, PermissionHelperService],
  exports: [AlertsService],
})
export class AlertsModule {}
