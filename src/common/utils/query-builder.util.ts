import { SelectQueryBuilder, Brackets } from 'typeorm';
import { FilterCondition, FilterOperator, ConditionLogic, SortConfig, FieldType } from '../dto/filter.dto';
import { BadRequestException } from '@nestjs/common';

export class QueryBuilderUtil {
  /**
   * Apply filters to a TypeORM query builder
   */
  static applyFilters<T>(
    queryBuilder: SelectQueryBuilder<T>,
    conditions: FilterCondition[],
    conditionLogic: ConditionLogic = ConditionLogic.AND,
    entityAlias: string = queryBuilder.alias
  ): SelectQueryBuilder<T> {
    if (!conditions || conditions.length === 0) {
      return queryBuilder;
    }

    const whereMethod = conditionLogic === ConditionLogic.OR ? 'orWhere' : 'andWhere';

    queryBuilder.andWhere(new Brackets(qb => {
      conditions.forEach((condition, index) => {
        if (!condition.field || !condition.operator) {
          return;
        }

        const paramKey = `${condition.field.replace('.', '_')}_${index}`;
        const fieldPath = condition.field.includes('.') ? condition.field : `${entityAlias}.${condition.field}`;

        switch (condition.operator) {
          case FilterOperator.EQUALS:
            if (condition.value && condition.value.length > 0) {
              if (condition.value.length === 1) {
                qb[index === 0 ? 'where' : whereMethod](`${fieldPath} = :${paramKey}`, {
                  [paramKey]: condition.value[0]
                });
              } else {
                qb[index === 0 ? 'where' : whereMethod](`${fieldPath} IN (:...${paramKey})`, {
                  [paramKey]: condition.value
                });
              }
            }
            break;

          case FilterOperator.CONTAINS:
            if (condition.fieldType === FieldType.TEXT && condition.value && condition.value.length > 0) {
              const containsConditions = condition.value.map((val, valIndex) => {
                const valParamKey = `${paramKey}_${valIndex}`;
                return { condition: `${fieldPath} ILIKE :${valParamKey}`, param: valParamKey, value: `%${val}%` };
              });
              
              const conditionString = containsConditions.map(c => c.condition).join(' OR ');
              const parameters = containsConditions.reduce((params, c) => {
                params[c.param] = c.value;
                return params;
              }, {});
              
              if (conditionLogic === ConditionLogic.OR || conditionLogic === ConditionLogic.CONTAINS) {
                qb[index === 0 ? 'where' : 'orWhere'](`(${conditionString})`, parameters);
              } else {
                qb[index === 0 ? 'where' : whereMethod](`(${conditionString})`, parameters);
              }
            } else if (condition.fieldType === FieldType.SELECT && condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} IN (:...${paramKey})`, {
                [paramKey]: condition.value
              });
            }
            break;

          case FilterOperator.STARTS_WITH:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} ILIKE :${paramKey}`, {
                [paramKey]: `${condition.value[0]}%`
              });
            }
            break;

          case FilterOperator.ENDS_WITH:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} ILIKE :${paramKey}`, {
                [paramKey]: `%${condition.value[0]}`
              });
            }
            break;

          case FilterOperator.GREATER_THAN:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} > :${paramKey}`, {
                [paramKey]: condition.value[0]
              });
            }
            break;

          case FilterOperator.GREATER_THAN_OR_EQUAL:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} >= :${paramKey}`, {
                [paramKey]: condition.value[0]
              });
            }
            break;

          case FilterOperator.LESS_THAN:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} < :${paramKey}`, {
                [paramKey]: condition.value[0]
              });
            }
            break;

          case FilterOperator.LESS_THAN_OR_EQUAL:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} <= :${paramKey}`, {
                [paramKey]: condition.value[0]
              });
            }
            break;

          case FilterOperator.IN:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} IN (:...${paramKey})`, {
                [paramKey]: condition.value
              });
            }
            break;

          case FilterOperator.NOT_IN:
            if (condition.value && condition.value.length > 0) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} NOT IN (:...${paramKey})`, {
                [paramKey]: condition.value
              });
            }
            break;

          case FilterOperator.BETWEEN:
            // Handle date fields with dateFrom/dateTo
            if (condition.fieldType === FieldType.DATE && condition.dateFrom && condition.dateTo) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} BETWEEN :${paramKey}_from AND :${paramKey}_to`, {
                [`${paramKey}_from`]: condition.dateFrom,
                [`${paramKey}_to`]: condition.dateTo
              });
            }
            // Handle number fields with value[0] and value[1]
            else if (condition.fieldType === FieldType.NUMBER && condition.value && condition.value.length >= 2) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} BETWEEN :${paramKey}_from AND :${paramKey}_to`, {
                [`${paramKey}_from`]: condition.value[0],
                [`${paramKey}_to`]: condition.value[1]
              });
            }
            // Handle other field types with value array
            else if (condition.value && condition.value.length >= 2) {
              qb[index === 0 ? 'where' : whereMethod](`${fieldPath} BETWEEN :${paramKey}_from AND :${paramKey}_to`, {
                [`${paramKey}_from`]: condition.value[0],
                [`${paramKey}_to`]: condition.value[1]
              });
            }
            break;

          default:
            break;
        }

        // Handle date range filters for date fields
        if (condition.fieldType === FieldType.DATE && condition.dateFrom && condition.dateTo) {
          const dateParamKey = `${condition.field}_date_${index}`;
          qb[index === 0 ? 'where' : whereMethod](`${fieldPath} BETWEEN :${dateParamKey}_from AND :${dateParamKey}_to`, {
            [`${dateParamKey}_from`]: condition.dateFrom,
            [`${dateParamKey}_to`]: condition.dateTo
          });
        }
      });
    }));

    return queryBuilder;
  }

  /**
   * Apply sorting to a TypeORM query builder
   */
  static applySorting<T>(
    queryBuilder: SelectQueryBuilder<T>,
    sorting: SortConfig[],
    entityAlias: string = queryBuilder.alias
  ): SelectQueryBuilder<T> {
    if (!sorting || sorting.length === 0) {
      return queryBuilder;
    }

    // Sort by priority first
    const sortedConfigs = [...sorting].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    sortedConfigs.forEach((sortConfig, index) => {
      if (!sortConfig.field) {
        return;
      }

      const fieldPath = sortConfig.field.includes('.') ? sortConfig.field : `${entityAlias}.${sortConfig.field}`;
      const direction = sortConfig.direction?.toUpperCase() as 'ASC' | 'DESC' || 'ASC';

      if (index === 0) {
        queryBuilder.orderBy(fieldPath, direction);
      } else {
        queryBuilder.addOrderBy(fieldPath, direction);
      }
    });

    return queryBuilder;
  }

  /**
   * Apply global search to specified fields
   */
  static applyGlobalSearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string,
    searchFields: string[],
    entityAlias: string = queryBuilder.alias
  ): SelectQueryBuilder<T> {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
      return queryBuilder;
    }

    queryBuilder.andWhere(new Brackets(qb => {
      searchFields.forEach((field, index) => {
        const fieldPath = field.includes('.') ? field : `${entityAlias}.${field}`;
        const paramKey = `globalSearch_${field.replace('.', '_')}`;
        
        if (index === 0) {
          qb.where(`${fieldPath} ILIKE :${paramKey}`, {
            [paramKey]: `%${searchTerm}%`
          });
        } else {
          qb.orWhere(`${fieldPath} ILIKE :${paramKey}`, {
            [paramKey]: `%${searchTerm}%`
          });
        }
      });
    }));

    return queryBuilder;
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}
