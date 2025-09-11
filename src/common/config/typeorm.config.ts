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
      entities: [Permission, Permission, Role, Unit, User, ManagerPermission, Category, Unit, Room, Asset, RfidTag, FixedAsset, ToolsEquipment],
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
  entities: [Permission, Role, Unit, User, ManagerPermission, Category, Unit, Room, Asset, FixedAsset, ToolsEquipment, RfidTag],
  migrations: [__dirname + "/../../migrations/*{.ts,.js}"],
  migrationsTableName: "typeorm_migrations",
});

export default dataSource;
