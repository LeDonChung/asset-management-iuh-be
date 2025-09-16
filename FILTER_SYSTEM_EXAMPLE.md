# Advanced Filter System - Usage Example

## Overview
The backend filter system now supports the frontend's filter format with proper mapping between frontend operators and backend enums.

## Request Format
Your frontend sends this exact format:
```json
{
    "conditionLogic": "contains",
    "conditions": [
        {
            "field": "name",
            "fieldType": "text",
            "operator": "contains",
            "value": ["a", "b"]
        },
        {
            "field": "year",
            "fieldType": "select",
            "operator": "contains",
            "value": ["2024", "2023"],
            "sort": "asc"
        },
        {
            "field": "startDate",
            "fieldType": "date",
            "operator": "contains",
            "value": [],
            "dateFrom": "2025-09-16",
            "dateTo": "2025-09-17"
        },
        {
            "field": "endDate",
            "fieldType": "date",
            "operator": "contains",
            "value": [],
            "dateFrom": "2025-09-17",
            "dateTo": "2025-09-18"
        },
        {
            "field": "status",
            "fieldType": "select",
            "operator": "contains",
            "value": ["PLANNED", "IN_PROGRESS", "COMPLETED", "CLOSED"]
        },
        {
            "field": "isGlobal",
            "fieldType": "select",
            "operator": "equals",
            "value": [true, false]
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalItems": 0,
        "itemsPerPage": 20,
        "totalPages": 0
    },
    "sorting": [
        {
            "field": "year",
            "direction": "asc",
            "priority": 0
        }
    ],
    "search": null
}
```

## Backend Mapping

### 1. Condition Logic Mapping
- Frontend `"contains"` → Backend `ConditionLogic.AND`
- Frontend `"equals"` → Backend `ConditionLogic.OR`
- Frontend `"not_contains"` → Backend `ConditionLogic.AND` (with NOT_IN operators)

### 2. Operator Mapping
- Frontend `"contains"` → Backend `FilterOperator.CONTAINS`
- Frontend `"equals"` → Backend `FilterOperator.EQUALS`
- Frontend `"not_contains"` → Backend `FilterOperator.NOT_IN`

### 3. Field Type Auto-Detection
For inventory fields, the system automatically detects:
- `name` → `FieldType.TEXT`
- `year` → `FieldType.NUMBER`
- `startDate`, `endDate` → `FieldType.DATE`
- `status` → `FieldType.SELECT`
- `isGlobal` → `FieldType.BOOLEAN`

### 4. Generated SQL Query
Your request would generate SQL similar to:
```sql
SELECT inventory.* FROM inventory_session inventory
LEFT JOIN user creator ON inventory.createdBy = creator.id
WHERE (
    (inventory.name ILIKE '%a%' OR inventory.name ILIKE '%b%') AND
    (inventory.year IN (2024, 2023)) AND
    (inventory.startDate BETWEEN '2025-09-16' AND '2025-09-17') AND
    (inventory.endDate BETWEEN '2025-09-17' AND '2025-09-18') AND
    (inventory.status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')) AND
    (inventory.isGlobal IN (true, false))
)
ORDER BY inventory.year ASC
LIMIT 20 OFFSET 0;
```

## Response Format
The backend returns paginated results:
```json
{
    "data": [
        {
            "id": "uuid",
            "name": "Inventory Session Name",
            "year": 2024,
            "status": "PLANNED",
            // ... other fields
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "totalPages": 5,
        "hasNext": true,
        "hasPrev": false
    }
}
```

## API Endpoints

### POST /api/v1/inventories
- **Description**: Get filtered and paginated inventory list
- **Method**: POST (to support complex filter body)
- **Body**: InventoryFilterDto (your frontend format)
- **Response**: PaginatedInventoryResponseDto

### GET /api/v1/inventories/simple
- **Description**: Get simple inventory list (no filters)
- **Method**: GET
- **Response**: InventorySessionResponseDto[]

## Usage in Frontend
```typescript
// Your existing frontend code works as-is
const filterRequest = {
    conditionLogic: "contains",
    conditions: [
        {
            field: "name",
            fieldType: "text",
            operator: "contains",
            value: ["search term"]
        }
    ],
    pagination: {
        currentPage: 1,
        itemsPerPage: 20
    }
};

const response = await fetch('/api/v1/inventories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filterRequest)
});
```

## Key Benefits
1. **No Frontend Changes**: Your existing AdvancedFilter component works unchanged
2. **Flexible Mapping**: Backend automatically maps frontend operators to appropriate SQL operations
3. **Type Safety**: Proper validation and type conversion
4. **Extensible**: Easy to add new field types and operators
5. **Reusable**: FilterMapperUtil can be used for other entities (users, assets, etc.)
