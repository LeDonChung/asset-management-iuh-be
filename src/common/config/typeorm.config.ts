import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from "@nestjs/typeorm";
import { Role } from "src/entities/role.entity";
import { Permission } from "src/entities/permission.entity";
import { Unit } from "src/entities/unit.entity";
import { User } from "src/entities/user.entity";
import { ManagerPermission } from "src/entities/manager-permission.entity";
import { Category } from "src/entities/category.entity";
import { DataSource } from "typeorm";
import { Room } from "src/entities/room.entity";
import { Asset, FixedAsset, ToolsEquipment } from "src/entities/asset.entity";
import { RfidTag } from "src/entities/rfid-tag.entity";
import { FileUrl } from "src/entities/file-url.entity";
import { InventorySession } from "src/entities/inventory-session.entity";
import { InventorySessionUnit } from "src/entities/inventory-session-unit.entity";
import { InventorySessionMember } from "src/entities/inventory-session-member.entity";
import { InventorySub } from "src/entities/inventory-sub.entity";
import { SubInventoryMember } from "src/entities/sub-inventory-member.entity";
import { InventoryGroup } from "src/entities/inventory-group";
import { InventoryGroupMember } from "src/entities/inventory-group-member.entity";
import { InventoryGroupAssignment } from "src/entities/inventory-group-assignment";
import { InventoryResult } from "src/entities/inventory-result";
import { AssetBook } from "src/entities/asset-book.entity";
import { AssetBookItem } from "src/entities/asset-book-item.entity";
import { Alert } from "src/entities/alert.entity";

export const TypeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [],
  useFactory: (): TypeOrmModuleOptions => {
    return {
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "asset",
      // Connection pool configuration
      extra: {
        connectionLimit: 5,
        acquireTimeout: 30000,
        timeout: 30000,
        reconnect: true,
        multipleStatements: false,
        idleTimeout: 300000,
        maxReconnects: 3,
        reconnectDelay: 2000,
      },
      entities: [
        Permission, 
        Role, 
        Unit, 
        User, 
        ManagerPermission, 
        Category, 
        Room, 
        Asset, 
        RfidTag, 
        FixedAsset, 
        ToolsEquipment, 
        FileUrl, 
        InventorySession, 
        InventorySessionUnit,
        InventorySessionMember,
        InventorySub,
        SubInventoryMember,
        InventoryGroup,
        InventoryGroupMember,
        InventoryGroupAssignment,
        InventoryResult,
        AssetBook,
        AssetBookItem,
        Alert
      ],
      synchronize: false,
      logging: false,
      migrations: [__dirname + "/../../migrations/*{.ts,.js}"],
      migrationsTableName: "typeorm_migrations",
    };
  },
  inject: [],
};

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "asset",
  extra: {
    connectionLimit: 3,
    acquireTimeout: 20000,
    timeout: 20000,
  },
  entities: [
    Permission, 
    Role, 
    Unit, 
    User, 
    ManagerPermission, 
    Category, 
    Room, 
    Asset, 
    FixedAsset, 
    ToolsEquipment, 
    RfidTag, 
    FileUrl, 
    InventorySession, 
    InventorySessionUnit,
    InventorySessionMember,
    InventorySub,
    SubInventoryMember,
    InventoryGroup,
    InventoryGroupMember,
    InventoryGroupAssignment,
    InventoryResult,
    AssetBook,
    AssetBookItem,
    Alert
  ],
  migrations: [__dirname + "/../../migrations/*{.ts,.js}"],
  migrationsTableName: "typeorm_migrations",
});

export default dataSource;
