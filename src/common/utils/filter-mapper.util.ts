import { FilterCondition, FilterOperator, ConditionLogic, FieldType } from '../dto/filter.dto';

/**
 * Maps frontend filter operators to backend FilterOperator enum
 */
export class FilterMapperUtil {
  
  /**
   * Map frontend operator string to backend FilterOperator
   */
  static mapOperator(frontendOperator: string, fieldType?: string): FilterOperator {
    // Handle frontend operators
    switch (frontendOperator.toLowerCase()) {
      case 'contains':
        return FilterOperator.CONTAINS;
      case 'equals':
        return FilterOperator.EQUALS;
      case 'not_contains':
        return FilterOperator.NOT_IN;
      case 'startswith':
      case 'starts_with':
        return FilterOperator.STARTS_WITH;
      case 'endswith':
      case 'ends_with':
        return FilterOperator.ENDS_WITH;
      case 'gt':
      case 'greater_than':
        return FilterOperator.GREATER_THAN;
      case 'gte':
      case 'greater_than_or_equal':
        return FilterOperator.GREATER_THAN_OR_EQUAL;
      case 'lt':
      case 'less_than':
        return FilterOperator.LESS_THAN;
      case 'lte':
      case 'less_than_or_equal':
        return FilterOperator.LESS_THAN_OR_EQUAL;
      case 'in':
        return FilterOperator.IN;
      case 'notin':
      case 'not_in':
        return FilterOperator.NOT_IN;
      case 'between':
        return FilterOperator.BETWEEN;
      default:
        return FilterOperator.CONTAINS; // Default fallback
    }
  }

  /**
   * Map frontend condition logic to backend ConditionLogic
   */
  static mapConditionLogic(frontendLogic: string): ConditionLogic {
    switch (frontendLogic?.toLowerCase()) {
      case 'contains':
      case 'and':
        return ConditionLogic.AND;
      case 'equals':
      case 'or':
        return ConditionLogic.OR;
      case 'not_contains':
        return ConditionLogic.AND; // Treat as AND with NOT_IN operators
      default:
        return ConditionLogic.AND;
    }
  }

  /**
   * Map frontend field type to backend FieldType
   */
  static mapFieldType(frontendType: string): FieldType {
    switch (frontendType?.toLowerCase()) {
      case 'text':
        return FieldType.TEXT;
      case 'number':
        return FieldType.NUMBER;
      case 'date':
        return FieldType.DATE;
      case 'select':
        return FieldType.SELECT;
      case 'boolean':
        return FieldType.BOOLEAN;
      default:
        return FieldType.TEXT;
    }
  }

  /**
   * Convert frontend filter condition to backend format
   */
  static mapFrontendCondition(frontendCondition: any): FilterCondition {
    const fieldType = this.mapFieldType(frontendCondition.fieldType || 'text');
    const operator = this.mapOperator(frontendCondition.operator, frontendCondition.fieldType);
    
    // Ensure value is always an array
    let value = frontendCondition.value;
    if (!Array.isArray(value)) {
      value = value !== undefined && value !== null && value !== '' ? [value] : [];
    }

    return {
      field: frontendCondition.field,
      fieldType,
      operator,
      value,
      dateFrom: frontendCondition.dateFrom,
      dateTo: frontendCondition.dateTo,
      sort: frontendCondition.sort
    };
  }

  /**
   * Convert entire frontend filter request to backend format
   */
  static mapFrontendFilterRequest(frontendRequest: any) {
    const conditionLogic = this.mapConditionLogic(frontendRequest.conditionLogic);
    
    const conditions = (frontendRequest.conditions || []).map((condition: any) => 
      this.mapFrontendCondition(condition)
    );

    return {
      conditionLogic,
      conditions,
      pagination: frontendRequest.pagination || {
        currentPage: 1,
        itemsPerPage: 5,
        totalItems: 0,
        totalPages: 0
      },
      sorting: frontendRequest.sorting || [],
      search: frontendRequest.search || null
    };
  }

  /**
   * Get inventory-specific field type mapping
   */
  static getInventoryFieldType(fieldName: string): FieldType {
    const fieldTypeMap: Record<string, FieldType> = {
      'name': FieldType.TEXT,
      'description': FieldType.TEXT,
      'period': FieldType.TEXT,
      'year': FieldType.NUMBER,
      'startDate': FieldType.DATE,
      'endDate': FieldType.DATE,
      'status': FieldType.SELECT,
      'isGlobal': FieldType.BOOLEAN,
      'createdAt': FieldType.DATE,
      'updatedAt': FieldType.DATE
    };

    return fieldTypeMap[fieldName] || FieldType.TEXT;
  }

  /**
   * Enhanced mapping for inventory conditions with automatic field type detection
   */
  static mapInventoryCondition(frontendCondition: any): FilterCondition {
    const autoDetectedFieldType = this.getInventoryFieldType(frontendCondition.field);
    const fieldType = frontendCondition.fieldType 
      ? this.mapFieldType(frontendCondition.fieldType)
      : autoDetectedFieldType;
    
    const operator = this.mapOperator(frontendCondition.operator, frontendCondition.fieldType);
    
    // Ensure value is always an array
    let value = frontendCondition.value;
    if (!Array.isArray(value)) {
      value = value !== undefined && value !== null && value !== '' ? [value] : [];
    }

    // Special handling for boolean fields
    if (fieldType === FieldType.BOOLEAN && value.length > 0) {
      value = value.map((v: any) => {
        if (typeof v === 'string') {
          return v.toLowerCase() === 'true' || v === '1';
        }
        return Boolean(v);
      });
    }

    // Special handling for number fields
    if (fieldType === FieldType.NUMBER && value.length > 0) {
      value = value.map((v: any) => {
        const num = Number(v);
        return isNaN(num) ? v : num;
      });
    }

    return {
      field: frontendCondition.field,
      fieldType,
      operator,
      value,
      dateFrom: frontendCondition.dateFrom,
      dateTo: frontendCondition.dateTo,
      sort: frontendCondition.sort
    };
  }
}
