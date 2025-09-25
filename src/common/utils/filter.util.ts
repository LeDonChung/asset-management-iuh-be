import { Repository, SelectQueryBuilder } from 'typeorm';
import { FilterMapperUtil } from './filter-mapper.util';
import { QueryBuilderUtil } from './query-builder.util';
import { FieldType } from '../dto/filter.dto';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponseDto } from '../dto/pagination.dto';

export interface FilterConfig {
  searchFields?: string[];
  fieldTypeMap?: Record<string, FieldType>;
  defaultSorting?: { field: string; direction: 'ASC' | 'DESC' };
  relations?: string[];
}

export class FilterUtil {
  /**
   * Apply filters to query builder with entity-specific configuration
   */
  static applyFiltersToQuery<Entity>(
    queryBuilder: SelectQueryBuilder<Entity>,
    filterDto: any,
    config: FilterConfig,
    entityAlias: string = queryBuilder.alias
  ): void {
    // Map frontend filter format to backend format
    const mappedFilter = FilterMapperUtil.mapFrontendFilterRequest(filterDto);
    
    // Map conditions with entity-specific field type detection
    const mappedConditions = (filterDto.conditions || []).map((condition: any) => 
      FilterUtil.mapEntityCondition(condition, config.fieldTypeMap)
    );

    // Apply filters if provided
    if (mappedConditions && mappedConditions.length > 0) {
      QueryBuilderUtil.applyFilters(
        queryBuilder,
        mappedConditions,
        mappedFilter.conditionLogic,
        entityAlias
      );
    }

    // Apply global search if provided
    if (mappedFilter.search && config.searchFields) {
      QueryBuilderUtil.applyGlobalSearch(
        queryBuilder,
        mappedFilter.search,
        config.searchFields,
        entityAlias
      );
    }

    // Apply sorting if provided
    if (mappedFilter.sorting && mappedFilter.sorting.length > 0) {
      QueryBuilderUtil.applySorting(queryBuilder, mappedFilter.sorting, entityAlias);
    } else if (config.defaultSorting) {
      // Apply default sorting
      queryBuilder.orderBy(
        `${entityAlias}.${config.defaultSorting.field}`,
        config.defaultSorting.direction.toUpperCase() as 'ASC' | 'DESC'
      );
    }
  }

  /**
   * Build base query with relations
   */
  static buildBaseQuery<Entity>(
    repository: Repository<Entity>,
    config: FilterConfig,
    entityAlias?: string
  ): SelectQueryBuilder<Entity> {
    const alias = entityAlias || repository.metadata.tableName;
    const queryBuilder = repository.createQueryBuilder(alias);

    // Add relations if configured
    if (config.relations) {
      config.relations.forEach(relation => {
        const relationParts = relation.split('.');
        if (relationParts.length === 1) {
          queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relation);
        } else {
          // Handle nested relations like 'user.profile'
          const baseRelation = relationParts[0];
          const nestedRelation = relationParts.slice(1).join('.');
          queryBuilder.leftJoinAndSelect(`${alias}.${baseRelation}`, baseRelation);
          queryBuilder.leftJoinAndSelect(`${baseRelation}.${nestedRelation}`, relationParts[relationParts.length - 1]);
        }
      });
    }

    return queryBuilder;
  }

  /**
   * Generic method to get filtered and paginated results
   */
  static async getFilteredResults<Entity, ResponseDto>(
    repository: Repository<Entity>,
    filterDto: any,
    responseClass: new () => ResponseDto,
    config: FilterConfig,
    entityAlias?: string
  ): Promise<PaginatedResponseDto<ResponseDto>> {
    const queryBuilder = FilterUtil.buildBaseQuery(repository, config, entityAlias);

    // Apply filters
    FilterUtil.applyFiltersToQuery(queryBuilder, filterDto, config, entityAlias || queryBuilder.alias);

    // Get pagination settings with defaults
    const page = filterDto.pagination?.currentPage || 1;
    const limit = filterDto.pagination?.itemsPerPage || 5;
    const skip = (page - 1) * limit;

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query and get count
    const [entities, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTOs
    const data = plainToInstance(responseClass, entities, {
      excludeExtraneousValues: true,
    });

    // Calculate pagination metadata
    const pagination = QueryBuilderUtil.calculatePagination(page, limit, total);

    return new PaginatedResponseDto(data, pagination);
  }

  /**
   * Generic method to get all results without filtering (for simple lists)
   */
  static async getAllResults<Entity, ResponseDto>(
    repository: Repository<Entity>,
    responseClass: new () => ResponseDto,
    config: FilterConfig,
    entityAlias?: string
  ): Promise<ResponseDto[]> {
    const queryBuilder = FilterUtil.buildBaseQuery(repository, config, entityAlias);

    // Apply default sorting if configured
    if (config.defaultSorting) {
      const alias = entityAlias || queryBuilder.alias;
      queryBuilder.orderBy(
        `${alias}.${config.defaultSorting.field}`,
        config.defaultSorting.direction.toUpperCase() as 'ASC' | 'DESC'
      );
    }

    const entities = await queryBuilder.getMany();

    return plainToInstance(responseClass, entities, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Map entity-specific condition with field type detection
   */
  private static mapEntityCondition(frontendCondition: any, fieldTypeMap?: Record<string, FieldType>) {
    const autoDetectedFieldType = FilterUtil.getEntityFieldType(frontendCondition.field, fieldTypeMap);
    const fieldType = frontendCondition.fieldType 
      ? FilterMapperUtil.mapFieldType(frontendCondition.fieldType)
      : autoDetectedFieldType;
    
    const operator = FilterMapperUtil.mapOperator(frontendCondition.operator, frontendCondition.fieldType);
    
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

  /**
   * Get entity-specific field type
   */
  private static getEntityFieldType(fieldName: string, fieldTypeMap?: Record<string, FieldType>): FieldType {
    if (fieldTypeMap && fieldTypeMap[fieldName]) {
      return fieldTypeMap[fieldName];
    }
    return FieldType.TEXT; // Default fallback
  }
}
