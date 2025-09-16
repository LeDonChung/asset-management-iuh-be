import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Base filter condition format for all entities
export class BaseFilterCondition {
  @ApiPropertyOptional({ description: 'Field name' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ description: 'Field type' })
  @IsOptional()
  @IsString()
  fieldType?: string;

  @ApiPropertyOptional({ description: 'Operator' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ description: 'Values' })
  @IsOptional()
  value?: any[];

  @ApiPropertyOptional({ description: 'Date from' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class BasePagination {
  @ApiPropertyOptional({ description: 'Current page', default: 1 })
  @IsOptional()
  currentPage?: number = 1;

  @ApiPropertyOptional({ description: 'Total items', default: 0 })
  @IsOptional()
  totalItems?: number = 0;

  @ApiPropertyOptional({ description: 'Items per page', default: 5 })
  @IsOptional()
  itemsPerPage?: number = 5;

  @ApiPropertyOptional({ description: 'Total pages', default: 0 })
  @IsOptional()
  totalPages?: number = 0;
}

export class BaseSorting {
  @ApiPropertyOptional({ description: 'Field to sort' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional({ description: 'Sort priority' })
  @IsOptional()
  priority?: number;
}

export abstract class BaseFilterDto {
  @ApiPropertyOptional({ 
    description: 'Condition logic',
    enum: ['and', 'or', 'contains'],
    default: 'contains'
  })
  @IsOptional()
  @IsString()
  conditionLogic?: string = 'contains';

  @ApiPropertyOptional({ 
    description: 'Filter conditions',
    type: [BaseFilterCondition]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseFilterCondition)
  conditions?: BaseFilterCondition[] = [];

  @ApiPropertyOptional({ 
    description: 'Pagination settings',
    type: BasePagination
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasePagination)
  pagination?: BasePagination;

  @ApiPropertyOptional({ 
    description: 'Sorting settings',
    type: [BaseSorting]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseSorting)
  sorting?: BaseSorting[] = [];

  @ApiPropertyOptional({ description: 'Global search term' })
  @IsOptional()
  @IsString()
  search?: string;
}
