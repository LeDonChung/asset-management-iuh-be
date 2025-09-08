# Hướng dẫn Phát triển - Asset Management System

## 📚 Mục lục
- [Phân tích Module Users](#phân-tích-module-users)
- [Tạo Module mới](#tạo-module-mới)
- [Cấu hình Authentication & Authorization](#cấu-hình-authentication--authorization)
- [Best Practices](#best-practices)
- [Code Examples](#code-examples)

## 🔍 Phân tích Module Users

### Cấu trúc module Users hiện tại:

```
src/modules/users/
├── users.module.ts           # Module configuration
├── users.controller.ts       # API endpoints với Guards
├── users.service.ts          # Business logic
├── users.controller.spec.ts  # Controller tests  
├── users.service.spec.ts     # Service tests
└── dto/
    ├── create-user.dto.ts    # DTO tạo user với validation
    ├── update-user.dto.ts    # DTO cập nhật (extends PartialType)
    ├── change-password.dto.ts # DTO đổi password
    └── user-response.dto.ts  # DTO response

```

### Điểm quan trọng từ Users Module:

1. **Module Structure** (`users.module.ts`):
   - Import TypeOrmModule với entities: `User`, `Role`, `Unit`
   - Export service để dùng ở modules khác
   - Clean và đơn giản

2. **DTOs Pattern**:
   - **CreateUserDto**: Validation mạnh mẽ với regex cho password
   - **UpdateUserDto**: Sử dụng `PartialType` từ CreateUserDto
   - **UserResponseDto**: Chỉ expose fields cần thiết, không include password
   - **ChangePasswordDto**: DTO riêng cho chức năng đổi mật khẩu

3. **Service Pattern** (`users.service.ts`):
   - Inject multiple repositories: User, Role, Unit
   - Business logic: check duplicate username/email, hash password
   - Transform entity to DTO với method riêng `transformToResponseDto`
   - Error handling với custom error responses

4. **Controller Pattern** (`users.controller.ts`):
   - Route prefix: `/api/v1/users`
   - Guards: `JwtAuthGuard` + `PermissionsGuard`
   - Permissions từ constants: `PermissionConstants.PERM_CREATE_USER`
   - Swagger documentation đầy đủ

5. **Entity Relationships**:
   - Many-to-Many với Role (qua bảng user_roles)
   - Many-to-One với Unit
   - Soft delete support với DeleteDateColumn
   - Enum cho UserStatus

6. **Security Features**:
   - Password validation regex mạnh
   - bcrypt hash với salt rounds = 12
   - Permission-based access control
   - JWT authentication required

## 🚀 Tạo Module mới (Dựa theo pattern Users)

### Bước 1: Tạo Module structure với NestJS CLI

```bash
# Tạo module mới (ví dụ: assets)
nest g module modules/assets

# Tạo controller
nest g controller modules/assets --no-spec

# Tạo service  
nest g service modules/assets --no-spec

# Tạo thư mục DTOs
mkdir src/modules/assets/dto
```

### Bước 2: Tạo DTOs (Theo pattern của Users)

**Create DTO** (`src/modules/assets/dto/create-asset.dto.ts`):
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsEnum, MinLength } from 'class-validator';

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  MAINTENANCE = 'MAINTENANCE',
  DISPOSED = 'DISPOSED',
}

export class CreateAssetDto {
  @ApiProperty({ 
    example: 'Laptop Dell Inspiron 15', 
    description: 'Asset name',
    minLength: 3
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Asset name must be at least 3 characters long' })
  name: string;

  @ApiProperty({ 
    example: 'Laptop for IT department staff', 
    description: 'Asset description',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: 15000000, 
    description: 'Asset value in VND'
  })
  @IsNumber({}, { message: 'Value must be a valid number' })
  @IsNotEmpty()
  value: number;

  @ApiProperty({ 
    example: 'uuid-unit-id', 
    description: 'Unit ID where asset belongs'
  })
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ 
    example: AssetStatus.ACTIVE, 
    description: 'Asset status',
    enum: AssetStatus
  })
  @IsEnum(AssetStatus, { message: 'Status must be a valid AssetStatus value' })
  @IsNotEmpty()
  status: AssetStatus;
}
```

**Update DTO** (`src/modules/assets/dto/update-asset.dto.ts`):
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
```

**Response DTO** (`src/modules/assets/dto/asset-response.dto.ts`):
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from './create-asset.dto';

export class UnitInfoDto {
  @ApiProperty({ example: "uuid" })
  id: string;

  @ApiProperty({ example: "IT Department" })
  name: string;
}

export class AssetResponseDto {
  @ApiProperty({ example: "uuid" })
  id: string;

  @ApiProperty({ example: "Laptop Dell Inspiron 15" })
  name: string;

  @ApiProperty({ example: "Laptop for IT department", required: false })
  description?: string;

  @ApiProperty({ example: 15000000 })
  value: number;

  @ApiProperty({ example: "uuid-unit-id" })
  unitId: string;

  @ApiProperty({ example: AssetStatus.ACTIVE, enum: AssetStatus })
  status: AssetStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: UnitInfoDto, required: false })
  unit?: UnitInfoDto;
}
```

### Bước 3: Tạo Entity (Theo pattern User Entity)

**Asset Entity** (`src/entities/asset.entity.ts`):
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from './unit.entity';
import { AssetStatus } from '../modules/assets/dto/create-asset.dto';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @Column({ nullable: true })
  unitId?: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  status: AssetStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Unit, (unit) => unit.assets)
  @JoinColumn({ name: 'unitId' })
  unit?: Unit;
}
```

### Bước 4: Implement Service (Theo pattern Users Service)

**Assets Service** (`src/modules/assets/assets.service.ts`):
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { Asset } from '../../entities/asset.entity';
import { Unit } from '../../entities/unit.entity';
import { errorResponse } from 'src/common/helpers/error-response';
import { ERR_EXISTS, NOT_FOUND } from 'src/common/utils/error-type-response';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<AssetResponseDto> {
    try {
      // Kiểm tra unit có tồn tại không
      if (createAssetDto.unitId) {
        const unit = await this.unitRepository.findOne({
          where: { id: createAssetDto.unitId }
        });
        if (!unit) {
          throw new NotFoundException(errorResponse(NOT_FOUND, `Unit not found`));
        }
      }

      // Tạo asset mới
      const asset = this.assetRepository.create({
        name: createAssetDto.name,
        description: createAssetDto.description,
        value: createAssetDto.value,
        unitId: createAssetDto.unitId,
        status: createAssetDto.status,
      });

      const savedAsset = await this.assetRepository.save(asset);
      
      return this.transformToResponseDto(savedAsset);
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }

  async findAll(): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      relations: ['unit'],
      order: { createdAt: 'DESC' }
    });

    return assets.map(this.transformToResponseDto);
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['unit'],
    });

    if (!asset) {
      throw new NotFoundException(errorResponse(NOT_FOUND, `Asset with ID ${id} not found`));
    }

    return this.transformToResponseDto(asset);
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['unit'],
    });

    if (!asset) {
      throw new NotFoundException(errorResponse(NOT_FOUND, `Asset with ID ${id} not found`));
    }

    // Kiểm tra unit nếu có thay đổi
    if (updateAssetDto.unitId && updateAssetDto.unitId !== asset.unitId) {
      const unit = await this.unitRepository.findOne({
        where: { id: updateAssetDto.unitId }
      });
      if (!unit) {
        throw new NotFoundException(errorResponse(NOT_FOUND, `Unit not found`));
      }
    }

    await this.assetRepository.update(id, updateAssetDto);
    
    const updatedAsset = await this.assetRepository.findOne({
      where: { id },
      relations: ['unit'],
    });

    return this.transformToResponseDto(updatedAsset);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.assetRepository.findOne({
      where: { id }
    });

    if (!asset) {
      throw new NotFoundException(errorResponse(NOT_FOUND, `Asset with ID ${id} not found`));
    }

    await this.assetRepository.softDelete(id);
  }

  private transformToResponseDto(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      value: Number(asset.value),
      unitId: asset.unitId,
      status: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      unit: asset.unit ? {
        id: asset.unit.id,
        name: asset.unit.name,
      } : undefined,
    };
  }
}
```

### Bước 5: Implement Controller (Theo pattern Users Controller)

**Assets Controller** (`src/modules/assets/assets.controller.ts`):
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionConstants } from 'src/common/utils/permission.constant';

@ApiTags('Assets')
@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, type: AssetResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_ASSET)
  @ApiBearerAuth()
  async create(@Body() createAssetDto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [AssetResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async findAll(): Promise<AssetResponseDto[]> {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AssetResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ASSET)
  @ApiBearerAuth()
  async findOne(@Param('id') id: string): Promise<AssetResponseDto> {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({ status: 200, type: AssetResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_ASSET)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_ASSET)
  @ApiBearerAuth()
  async remove(@Param('id') id: string): Promise<void> {
    return this.assetsService.remove(id);
  }
}
```

### Bước 6: Cập nhật Module (Theo pattern Users Module)

**Assets Module** (`src/modules/assets/assets.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from '../../entities/asset.entity';
import { Unit } from '../../entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Unit]),
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
```

### Bước 7: Cập nhật Permission Constants

**Permission Constants** (`src/common/utils/permission.constant.ts`):
```typescript
export const PermissionConstants = {
    // User permissions
    PERM_REMOVE_USER: 'PERM_REMOVE_USER',
    PERM_CREATE_USER: 'PERM_CREATE_USER',
    PERM_UPDATE_USER: 'PERM_UPDATE_USER',
    PERM_VIEW_USER: 'PERM_VIEW_USER',

    // Role permissions
    PERM_CREATE_ROLE: 'PERM_CREATE_ROLE',
    PERM_UPDATE_ROLE: 'PERM_UPDATE_ROLE',
    PERM_VIEW_ROLE: 'PERM_VIEW_ROLE',
    PERM_REMOVE_ROLE: 'PERM_REMOVE_ROLE',

    // Permission permissions
    PERM_CREATE_PERMISSION: 'PERM_CREATE_PERMISSION',
    PERM_UPDATE_PERMISSION: 'PERM_UPDATE_PERMISSION',
    PERM_VIEW_PERMISSION: 'PERM_VIEW_PERMISSION',
    PERM_REMOVE_PERMISSION: 'PERM_REMOVE_PERMISSION',

    // Asset permissions (NEW)
    PERM_CREATE_ASSET: 'PERM_CREATE_ASSET',
    PERM_UPDATE_ASSET: 'PERM_UPDATE_ASSET',
    PERM_VIEW_ASSET: 'PERM_VIEW_ASSET',
    PERM_REMOVE_ASSET: 'PERM_REMOVE_ASSET',
}
```

### Bước 7: Tạo Migration

```bash
# Tạo migration cho entity mới
pnpm run migration:generate -- src/migrations/CreateAssetTable

# Chạy migration
pnpm run migration:run
```

### Bước 8: Cập nhật App Module

**App Module** (`src/app.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// Existing modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

// New module
import { AssetsModule } from './modules/assets/assets.module';

// Configs
import { TypeOrmAsyncConfig } from './common/config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync(TypeOrmAsyncConfig),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AssetsModule, // Thêm module mới
  ],
})
export class AppModule {}
```

## 🔐 Cấu hình Authentication & Authorization

### 1. Sử dụng Guards

```typescript
// Trong controller
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)

// JwtAuthGuard: Kiểm tra JWT token
// RolesGuard: Kiểm tra vai trò user
// PermissionsGuard: Kiểm tra quyền cụ thể
```

### 2. Decorators

```typescript
// Lấy thông tin user hiện tại
@CurrentUser() user: User
@CurrentUser('id') userId: string

// Kiểm tra roles
@Roles(Role.ADMIN, Role.STAFF)

// Kiểm tra permissions
@Permissions('ASSET_CREATE', 'ASSET_UPDATE')
```

### 3. Thêm Permissions mới

**Trong database** (thêm vào bảng permissions):
```sql
INSERT INTO permissions (name, description) VALUES 
('ASSET_CREATE', 'Tạo tài sản mới'),
('ASSET_READ', 'Xem thông tin tài sản'),
('ASSET_UPDATE', 'Cập nhật tài sản'),
('ASSET_DELETE', 'Xóa tài sản');
```

**Trong constants** (`src/common/utils/permission.constant.ts`):
```typescript
export const PERMISSIONS = {
  // ... existing permissions
  ASSET_CREATE: 'ASSET_CREATE',
  ASSET_READ: 'ASSET_READ',
  ASSET_UPDATE: 'ASSET_UPDATE',
  ASSET_DELETE: 'ASSET_DELETE',
} as const;
```

## 📝 Best Practices

### 1. Naming Conventions
- **Files**: kebab-case (`asset-response.dto.ts`)
- **Classes**: PascalCase (`AssetResponseDto`)
- **Variables/Functions**: camelCase (`createAsset`)
- **Constants**: UPPER_SNAKE_CASE (`ASSET_CREATE`)

### 2. Error Handling
```typescript
// Trong service
if (!asset) {
  throw new NotFoundException(errorResponse('ASSET_NOT_FOUND', 'Tài sản không tồn tại'));
}

// Trong controller - sử dụng global exception filter
// Không cần try-catch, global filter sẽ xử lý
```

### 3. Response Format
```typescript
// Luôn sử dụng ResponseDto
return {
  code: 'SUCCESS_CODE',
  message: 'Success message',
  data: responseData,
};
```

### 4. Validation
```typescript
// Luôn validate input với class-validator
@IsString()
@IsNotEmpty()
@Length(1, 255)
name: string;
```

### 5. Documentation
```typescript
// Luôn có Swagger documentation
@ApiOperation({ summary: 'Mô tả endpoint' })
@ApiResponse({ status: 200, description: 'Success response' })
@ApiResponse({ status: 400, description: 'Bad request' })
```

## 🧪 Testing

### Unit Test cho Service

**assets.service.spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetsService } from './assets.service';
import { Asset } from 'src/entities/asset.entity';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('AssetsService', () => {
  let service: AssetsService;
  let repository: Repository<Asset>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(Asset),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    repository = module.get<Repository<Asset>>(getRepositoryToken(Asset));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const createAssetDto = {
        name: 'Test Asset',
        description: 'Test Description',
        value: 100000,
        unitId: 'unit-id',
      };
      
      const savedAsset = { id: 'asset-id', ...createAssetDto };
      const assetWithRelations = { 
        ...savedAsset, 
        unit: { id: 'unit-id', name: 'Test Unit' } 
      };

      mockRepository.create.mockReturnValue(savedAsset);
      mockRepository.save.mockResolvedValue(savedAsset);
      mockRepository.findOne.mockResolvedValue(assetWithRelations);

      const result = await service.create(createAssetDto, 'user-id');
      
      expect(result).toBeDefined();
      expect(result.name).toBe(createAssetDto.name);
    });
  });
});
```

### E2E Test

**assets.e2e-spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('AssetsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login để lấy token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass',
      });
    
    authToken = loginResponse.body.data.accessToken;
  });

  it('/assets (POST)', () => {
    return request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Asset',
        description: 'Test Description',
        value: 100000,
        unitId: 'unit-id',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.code).toBe('ASSET_CREATED');
        expect(res.body.data.name).toBe('Test Asset');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## 🚀 Commands tổng hợp

```bash
# Tạo full module structure
nest g module modules/assets
nest g controller modules/assets --no-spec
nest g service modules/assets --no-spec

# Tạo thư mục DTOs
mkdir src/modules/assets/dto

# Tạo migration
pnpm run migration:generate -- src/migrations/CreateAssetTable
pnpm run migration:run

# Chạy tests
pnpm run test # Unit tests
pnpm run test:e2e # E2E tests
pnpm run test:cov # Coverage

# Start development
pnpm run start:dev
```

## � Cấu hình Authentication & Authorization (Từ Users Module)

### 1. Guards được sử dụng

```typescript
// Trong controller
@UseGuards(JwtAuthGuard, PermissionsGuard)

// JwtAuthGuard: Kiểm tra JWT token hợp lệ
// PermissionsGuard: Kiểm tra quyền cụ thể từ PermissionConstants
```

### 2. Decorators pattern

```typescript
// Decorator Permissions từ users module
@Permissions(PermissionConstants.PERM_CREATE_USER)

// Các decorator khác có thể sử dụng:
@CurrentUser() user: User      // Lấy toàn bộ thông tin user
@CurrentUser('id') userId: string  // Lấy chỉ id
@Roles(Role.ADMIN, Role.STAFF)     // Nếu có RolesGuard
```

### 3. Route Structure Pattern

```typescript
// Pattern từ users controller
@Controller('api/v1/users')    // Prefix: /api/v1/users
@Controller('api/v1/assets')   // Cho module mới: /api/v1/assets

// HTTP Methods:
@Post()          // POST /api/v1/assets
@Get()           // GET /api/v1/assets  
@Get(':id')      // GET /api/v1/assets/:id
@Patch(':id')    // PATCH /api/v1/assets/:id
@Delete(':id')   // DELETE /api/v1/assets/:id
```

### 4. Permissions trong Database

**Thêm permissions mới vào database:**
```sql
-- Pattern từ users permissions
INSERT INTO permissions (name, description) VALUES 
('PERM_CREATE_ASSET', 'Create new asset'),
('PERM_VIEW_ASSET', 'View asset information'),
('PERM_UPDATE_ASSET', 'Update asset'),
('PERM_REMOVE_ASSET', 'Delete asset');
```

**Gán permissions cho roles:**
```sql
-- Ví dụ gán quyền cho ADMIN role
INSERT INTO role_permissions (roleId, permissionId) 
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'ADMIN' 
AND p.name IN ('PERM_CREATE_ASSET', 'PERM_VIEW_ASSET', 'PERM_UPDATE_ASSET', 'PERM_REMOVE_ASSET');
```

## 📝 Best Practices (Từ phân tích Users Module)

### 1. Naming Conventions
```typescript
// Files: kebab-case
create-user.dto.ts
user-response.dto.ts
users.service.ts

// Classes: PascalCase  
CreateUserDto
UserResponseDto
UsersService

// Variables/Functions: camelCase
createUser()
findAllUsers()
transformToResponseDto()

// Constants: UPPER_SNAKE_CASE
PERM_CREATE_USER
USER_STATUS_ACTIVE
```

### 2. DTO Patterns
```typescript
// CreateDTO: Full validation với examples
export class CreateUserDto {
  @ApiProperty({ example: 'john_doe', description: '...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;
}

// UpdateDTO: Sử dụng PartialType
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// ResponseDTO: Chỉ expose cần thiết, không password
export class UserResponseDto {
  id: string;
  username: string;
  // NO password field!
}
```

### 3. Service Patterns
```typescript
// Multiple repository injection
constructor(
  @InjectRepository(User) private userRepository: Repository<User>,
  @InjectRepository(Role) private roleRepository: Repository<Role>,
  @InjectRepository(Unit) private unitRepository: Repository<Unit>,
) {}

// Business validation
const existingUsername = await this.userRepository.findOne({
  where: { username: createUserDto.username }
});
if (existingUsername) {
  throw new BadRequestException(errorResponse(ERR_EXISTS, `Username already exists`));
}

// Transform method
private transformToResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    // Map relations carefully
    roles: user.roles?.map(role => ({ ... })) ?? [],
  };
}
```

### 4. Error Handling Pattern
```typescript
// Sử dụng errorResponse helper
import { errorResponse } from 'src/common/helpers/error-response';
import { ERR_EXISTS, NOT_FOUND } from 'src/common/utils/error-type-response';

// Example usage
throw new NotFoundException(errorResponse(NOT_FOUND, `User not found`));
throw new BadRequestException(errorResponse(ERR_EXISTS, `Email already exists`));
```

### 5. Security Patterns
```typescript
// Password hashing với bcryptjs
const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

// Password validation regex
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/)

// Relationships loading
const users = await this.userRepository.find({
  relations: ['roles', 'roles.permissions', 'unit'],
  order: { createdAt: 'DESC' }
});
```

### 6. Swagger Documentation Pattern
```typescript
@ApiTags('Users')                    // Grouping
@ApiBearerAuth()                     // Auth requirement
@ApiBody({ type: CreateUserDto })    // Request body
@ApiResponse({ status: 201, type: UserResponseDto })  // Success response
@HttpCode(HttpStatus.CREATED)        // Explicit status code
```

## �📋 Checklist cho Module mới

- [ ] Tạo module, controller, service với NestJS CLI
- [ ] Tạo entity với TypeORM decorators
- [ ] Tạo DTOs với validation decorators (pattern từ Users)
- [ ] Thêm Swagger documentation đầy đủ
- [ ] Cấu hình Guards (JWT + Permissions) theo Users pattern
- [ ] Thêm permissions mới vào PermissionConstants
- [ ] Thêm permissions vào database và gán cho roles
- [ ] Implement service với error handling pattern
- [ ] Implement controller với route pattern /api/v1/
- [ ] Viết unit tests cho service
- [ ] Viết e2e tests cho controller
- [ ] Tạo và chạy migrations
- [ ] Cập nhật App Module
- [ ] Test API endpoints với Postman/Thunder Client

---

**Happy Coding! 🎉**
