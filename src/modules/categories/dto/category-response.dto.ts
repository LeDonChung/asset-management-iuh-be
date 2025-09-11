import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Category name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Category code' })
  @Expose()
  code: string;

  @ApiProperty({ description: 'Category description', required: false })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Whether the category is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Parent category ID', required: false })
  @Expose()
  parentId?: string;

  @ApiProperty({ description: 'Parent category', required: false, type: () => CategoryResponseDto })
  @Expose()
  @Type(() => CategoryResponseDto)
  parent?: CategoryResponseDto;

  @ApiProperty({ description: 'Child categories', type: [CategoryResponseDto], required: false })
  @Expose()
  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;
}
