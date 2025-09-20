import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum FilterOperator {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'notIn',
  BETWEEN = 'between'
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  BOOLEAN = 'boolean'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export enum ConditionLogic {
  AND = 'and',
  OR = 'or',
  CONTAINS = 'contains'
}

export class FilterCondition {
  @ApiPropertyOptional({ description: 'Field name to filter by' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ 
    description: 'Type of field being filtered',
    enum: FieldType 
  })
  @IsOptional()
  @IsEnum(FieldType)
  fieldType?: FieldType;

  @ApiPropertyOptional({ 
    description: 'Filter operator',
    enum: FilterOperator 
  })
  @IsOptional()
  @IsEnum(FilterOperator)
  operator?: FilterOperator;

  @ApiPropertyOptional({ 
    description: 'Filter values',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  value?: any[];

  @ApiPropertyOptional({ description: 'Date from (for date range filters)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (for date range filters)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Sort direction for this field',
    enum: SortDirection 
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sort?: SortDirection;
}

export class SortConfig {
  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ 
    description: 'Sort direction',
    enum: SortDirection,
    default: SortDirection.ASC 
  })
  @IsOptional()
  @IsEnum(SortDirection)
  direction?: SortDirection = SortDirection.ASC;

  @ApiPropertyOptional({ 
    description: 'Sort priority (0 = highest priority)',
    default: 0 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  priority?: number = 0;
}

export class PaginationConfig {
  @ApiPropertyOptional({ 
    description: 'Current page number',
    default: 1 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  currentPage?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Total number of items',
    default: 0 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  totalItems?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Items per page',
    default: 20 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  itemsPerPage?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Total pages',
    default: 0 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  totalPages?: number = 0;
}

export class BaseFilterDto {
  @ApiPropertyOptional({ 
    description: 'Logic to combine conditions',
    enum: ConditionLogic,
    default: ConditionLogic.AND 
  })
  @IsOptional()
  @IsEnum(ConditionLogic)
  conditionLogic?: ConditionLogic = ConditionLogic.AND;

  @ApiPropertyOptional({ 
    description: 'Filter conditions',
    type: [FilterCondition]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterCondition)
  conditions?: FilterCondition[];

  @ApiPropertyOptional({ 
    description: 'Pagination configuration',
    type: PaginationConfig
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationConfig)
  pagination?: PaginationConfig;

  @ApiPropertyOptional({ 
    description: 'Sorting configuration',
    type: [SortConfig]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortConfig)
  sorting?: SortConfig[];

  @ApiPropertyOptional({ description: 'Global search term' })
  @IsOptional()
  @IsString()
  search?: string;
}
