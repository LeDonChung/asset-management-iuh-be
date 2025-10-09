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
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UnitsService } from "./units.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { UnitResponseDto } from "./dto/unit-response.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { UnitType } from "src/common/shared/UnitType";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { UnitFilterDto } from "./dto/unit-filter.dto";

@ApiTags("Units")
@Controller("api/v1/units")
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post("filter")
  @ApiOperation({
    summary: "Lấy danh sách tất cả kỳ kiểm kê với bộ lọc và phân trang",
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách kỳ kiểm kê với phân trang",
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async filter(
    @Body() filterDto: UnitFilterDto
  ): Promise<PaginatedResponseDto<UnitResponseDto>> {
    return this.unitsService.findAllWithFilter(filterDto);
  }

  @Get(":parentId/children")
  @ApiOperation({ summary: "Get child units of a parent unit" })
  @ApiParam({ name: "parentId", description: "Parent unit UUID" })
  @ApiResponse({
    status: 200,
    description: "List of child units retrieved successfully",
    type: [UnitResponseDto],
  })
  @ApiResponse({ status: 404, description: "Parent unit not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findChildren(
    @Param("parentId") parentId: string
  ): Promise<UnitResponseDto[]> {
    return this.unitsService.findChildren(parentId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new unit" })
  @ApiResponse({
    status: 201,
    description: "Unit created successfully",
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_UNIT)
  @ApiBearerAuth()
  async create(
    @Body() createUnitDto: CreateUnitDto,
    @CurrentUser() currentUser: User
  ): Promise<UnitResponseDto> {
    return this.unitsService.create(createUnitDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: "Get all units" })
  @ApiResponse({
    status: 200,
    description: "Units retrieved successfully",
    type: [UnitResponseDto],
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(): Promise<UnitResponseDto[]> {
    return this.unitsService.findAll();
  }

  @Get("root")
  @ApiOperation({ summary: "Get root units (campuses) with hierarchy" })
  @ApiResponse({
    status: 200,
    description: "List of root units retrieved successfully",
    type: [UnitResponseDto],
  })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findRootUnits(): Promise<UnitResponseDto[]> {
    return this.unitsService.findRootUnits();
  }

  @Get("type/:type")
  @ApiOperation({ summary: "Get units by type" })
  @ApiParam({ name: "type", enum: UnitType, description: "Unit type" })
  @ApiResponse({
    status: 200,
    description: "List of units by type retrieved successfully",
    type: [UnitResponseDto],
  })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findByType(@Param("type") type: UnitType): Promise<UnitResponseDto[]> {
    return this.unitsService.findByType(type);
  }

  @Get("campuses")
  @ApiOperation({ summary: "Get all campuses" })
  @ApiResponse({
    status: 200,
    description: "List of campuses retrieved successfully",
    type: [UnitResponseDto],
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findCampus(): Promise<UnitResponseDto[]> {
    try {
      return await this.unitsService.findByType(UnitType.CAMPUS);
    } catch (error) {
      console.error("Error in findCampus:", error);
      throw error;
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Get unit by ID" })
  @ApiParam({ name: "id", description: "Unit UUID" })
  @ApiResponse({
    status: 200,
    description: "Unit retrieved successfully",
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<UnitResponseDto> {
    return this.unitsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update unit by ID" })
  @ApiParam({ name: "id", description: "Unit UUID" })
  @ApiResponse({
    status: 200,
    description: "Unit updated successfully",
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_UNIT)
  @ApiBearerAuth()
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateUnitDto: UpdateUnitDto
  ): Promise<UnitResponseDto> {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete unit by ID" })
  @ApiParam({ name: "id", description: "Unit UUID" })
  @ApiResponse({
    status: 204,
    description: "Unit deleted successfully",
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_UNIT)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.unitsService.remove(id);
  }
}
