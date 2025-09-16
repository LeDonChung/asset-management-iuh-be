# Generic Filter System - Usage Guide

## Overview
Hệ thống filter generic cho phép tất cả các controllers sử dụng chung filter logic mà không cần duplicate code.

## Key Components

### 1. Generic Types
```typescript
// Generic paginated response
PaginatedResponseDto<T>

// Base filter DTO
BaseFilterDto
```

### 2. Filter Utility
```typescript
FilterUtil.getFilteredResults<Entity, ResponseDto>(
  repository: Repository<Entity>,
  filterDto: any,
  responseClass: new () => ResponseDto,
  config: FilterConfig,
  entityAlias?: string
): Promise<PaginatedResponseDto<ResponseDto>>
```

## Usage Examples

### 1. Inventory Service (Current)
```typescript
async findAllWithFilter(filterDto: InventoryFilterDto): Promise<PaginatedResponseDto<InventorySessionResponseDto>> {
  const config = {
    searchFields: ['name', 'description', 'period'],
    fieldTypeMap: {
      'name': FieldType.TEXT,
      'year': FieldType.NUMBER,
      'startDate': FieldType.DATE,
      'status': FieldType.SELECT,
      'isGlobal': FieldType.BOOLEAN,
    },
    defaultSorting: { field: 'createdAt', direction: 'DESC' as const },
    relations: ['creator', 'fileUrls', 'inventorySessionUnits']
  };

  return FilterUtil.getFilteredResults(
    this.inventorySessionRepository,
    filterDto,
    InventorySessionResponseDto,
    config,
    'inventory'
  );
}
```

### 2. User Service Example
```typescript
// dto/user-filter.dto.ts
export class UserFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ description: 'Quick filter by role' })
  @IsOptional()
  roleFilter?: string[];

  @ApiPropertyOptional({ description: 'Quick filter by status' })
  @IsOptional()
  statusFilter?: boolean;
}

// users.service.ts
async findAllWithFilter(filterDto: UserFilterDto): Promise<PaginatedResponseDto<UserResponseDto>> {
  const config = {
    searchFields: ['fullName', 'email', 'username'],
    fieldTypeMap: {
      'fullName': FieldType.TEXT,
      'email': FieldType.TEXT,
      'username': FieldType.TEXT,
      'isActive': FieldType.BOOLEAN,
      'createdAt': FieldType.DATE,
      'role': FieldType.SELECT,
    },
    defaultSorting: { field: 'createdAt', direction: 'DESC' as const },
    relations: ['profile', 'roles']
  };

  return FilterUtil.getFilteredResults(
    this.userRepository,
    filterDto,
    UserResponseDto,
    config,
    'user'
  );
}

// users.controller.ts
@Post()
async findAll(@Body() filterDto: UserFilterDto): Promise<PaginatedResponseDto<UserResponseDto>> {
  return this.usersService.findAllWithFilter(filterDto);
}
```

### 3. Asset Service Example
```typescript
// dto/asset-filter.dto.ts
export class AssetFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ description: 'Quick filter by category' })
  @IsOptional()
  categoryFilter?: string[];

  @ApiPropertyOptional({ description: 'Quick filter by condition' })
  @IsOptional()
  conditionFilter?: string[];
}

// assets.service.ts
async findAllWithFilter(filterDto: AssetFilterDto): Promise<PaginatedResponseDto<AssetResponseDto>> {
  const config = {
    searchFields: ['name', 'code', 'description'],
    fieldTypeMap: {
      'name': FieldType.TEXT,
      'code': FieldType.TEXT,
      'description': FieldType.TEXT,
      'purchasePrice': FieldType.NUMBER,
      'purchaseDate': FieldType.DATE,
      'category': FieldType.SELECT,
      'condition': FieldType.SELECT,
      'isActive': FieldType.BOOLEAN,
    },
    defaultSorting: { field: 'createdAt', direction: 'DESC' as const },
    relations: ['category', 'unit', 'room']
  };

  return FilterUtil.getFilteredResults(
    this.assetRepository,
    filterDto,
    AssetResponseDto,
    config,
    'asset'
  );
}
```

## Request Format (Same for all entities)
```json
{
  "conditionLogic": "contains",
  "conditions": [
    {
      "field": "name",
      "fieldType": "text",
      "operator": "contains",
      "value": ["search term"]
    },
    {
      "field": "createdAt",
      "fieldType": "date",
      "operator": "between",
      "dateFrom": "2025-01-01",
      "dateTo": "2025-12-31"
    }
  ],
    "pagination": {
        "currentPage": 1,
        "itemsPerPage": 5
    },
  "sorting": [
    {
      "field": "createdAt",
      "direction": "desc",
      "priority": 0
    }
  ],
  "search": "global search term"
}
```

## Response Format (Same for all entities)
```json
{
  "data": [
    // Array of entity DTOs
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 100,
    "totalPages": 20,
    "hasNext": true,
    "hasPrev": false,
    "nextPage": 2,
    "prevPage": null,
    "firstPage": 1,
    "lastPage": 20
  }
}
```

## Benefits

### 1. Code Reuse
- ✅ Một bộ filter logic cho tất cả entities
- ✅ Consistent response format
- ✅ Standardized pagination

### 2. Type Safety
- ✅ Generic types: `PaginatedResponseDto<T>`
- ✅ TypeScript support đầy đủ
- ✅ Compile-time type checking

### 3. Maintainability
- ✅ Central filter logic trong `FilterUtil`
- ✅ Easy to add new operators/features
- ✅ Consistent behavior across all modules

### 4. Flexibility
- ✅ Entity-specific field type mapping
- ✅ Configurable search fields
- ✅ Custom relations per entity
- ✅ Default sorting per entity

## Quick Setup for New Entity

1. **Create Filter DTO**:
```typescript
export class YourEntityFilterDto extends BaseFilterDto {
  // Add entity-specific quick filters if needed
}
```

2. **Update Service**:
```typescript
async findAllWithFilter(filterDto: YourEntityFilterDto): Promise<PaginatedResponseDto<YourEntityResponseDto>> {
  const config = {
    searchFields: ['field1', 'field2'],
    fieldTypeMap: { /* your field mappings */ },
    defaultSorting: { field: 'createdAt', direction: 'DESC' as const },
    relations: ['relation1', 'relation2']
  };

  return FilterUtil.getFilteredResults(
    this.yourRepository,
    filterDto,
    YourEntityResponseDto,
    config,
    'yourAlias'
  );
}
```

3. **Update Controller**:
```typescript
@Post()
async findAll(@Body() filterDto: YourEntityFilterDto): Promise<PaginatedResponseDto<YourEntityResponseDto>> {
  return this.yourService.findAllWithFilter(filterDto);
}
```

That's it! 🎉
