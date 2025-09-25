import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { Category } from '../../entities/category.entity';
import { plainToClass, plainToInstance } from 'class-transformer';
import { CommonUtils } from 'src/common/utils/common.utils';

@Injectable()
export class CategoriesService {
  
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find();
    return plainToInstance(CategoryResponseDto, categories, {
      excludeExtraneousValues: true,
    });
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check if name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException({
        code: 'CATEGORY_NAME_EXISTS',
        message: 'Category with this name already exists',
      });
    }

    const category = this.categoryRepository.create(createCategoryDto);
    category.code = CommonUtils.generateCode(createCategoryDto.name);

    // If parentCode is provided, verify parent exists
    if (createCategoryDto.parentCode) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { code: createCategoryDto.parentCode },
      });

      if (!parentCategory) {
        throw new NotFoundException({
          code: 'PARENT_CATEGORY_NOT_FOUND',
          message: 'Parent category not found',
        });
      }
      category.parent = parentCategory;
    }

    const savedCategory = await this.categoryRepository.save(category);
    
    return plainToClass(CategoryResponseDto, savedCategory, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    return plainToClass(CategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    // If parentCode is being updated, verify parent exists and prevent circular reference
    if (updateCategoryDto.parentCode !== undefined) {
      if (updateCategoryDto.parentCode) {
        // Check if parent exists
        const parentCategory = await this.categoryRepository.findOne({
          where: { code: updateCategoryDto.parentCode },
        });

        if (!parentCategory) {
          throw new NotFoundException({
            code: 'PARENT_CATEGORY_NOT_FOUND',
            message: 'Parent category not found',
          });
        }
        category.parent = parentCategory;
      }
    }

    Object.assign(category, updateCategoryDto);
    const updatedCategory = await this.categoryRepository.save(category);

    return plainToClass(CategoryResponseDto, updatedCategory, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new ConflictException({
        code: 'CATEGORY_HAS_CHILDREN',
        message: 'Cannot delete category that has child categories',
      });
    }

    await this.categoryRepository.remove(category);
  }
}
