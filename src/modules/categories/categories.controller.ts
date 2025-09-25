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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new category" })
  @ApiResponse({
    status: 201,
    description: "Category created successfully",
    type: CategoryResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_CATEGORY)
  @ApiBearerAuth()
  async create(
    @Body() createCategoryDto: CreateCategoryDto
  ): Promise<CategoryResponseDto> {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a category by ID" })
  @ApiParam({ name: "id", description: "Category ID (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Category retrieved successfully",
    type: CategoryResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_CATEGORY)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<CategoryResponseDto> {
    return await this.categoriesService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: "Get all categories" })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
    type: [CategoryResponseDto],
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_CATEGORY)
  @ApiBearerAuth()
  async findAll(): Promise<CategoryResponseDto[]> {
    return await this.categoriesService.findAll();
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", description: "Category ID (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Category updated successfully",
    type: CategoryResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_CATEGORY)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<CategoryResponseDto> {
    return await this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", description: "Category ID (UUID)" })
  @ApiResponse({
    status: 204,
    description: "Category deleted successfully",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_CATEGORY)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return await this.categoriesService.remove(id);
  }
}
