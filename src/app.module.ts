import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmAsyncConfig } from "./common/config/typeorm.config";
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { SeedingModule } from './modules/seeding/seeding.module';
import { UnitsModule } from './modules/units/units.module';
import { AssetsModule } from './modules/assets/assets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { InventoriesModule } from './modules/inventories/inventories.module';
import { FilesModule } from './modules/files/files.module';
import { InventorySubModule } from './modules/inventory-sub/inventory-sub.module';
import { InventoryGroupModule } from './modules/inventory-group/inventory-group.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync(TypeOrmAsyncConfig),
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: "medium",
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: "long",
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    SeedingModule,
    UnitsModule,
    AssetsModule,
    CategoriesModule,
    RoomsModule,
    InventoriesModule,
    FilesModule,
    InventorySubModule,
    InventoryGroupModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
