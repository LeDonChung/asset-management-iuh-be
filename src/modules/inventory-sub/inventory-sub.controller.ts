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
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { InventorySubService } from './inventory-sub.service';
import { CreateInventorySubDto } from './dto/create-inventory-sub.dto';
import { UpdateInventorySubDto } from './dto/update-inventory-sub.dto';
import { InventorySubResponseDto } from './dto/inventory-sub-response.dto';
import { User } from "src/entities/user.entity";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Inventory Sub")
@Controller('api/v1/inventory-sub')
export class InventorySubController {
  constructor(private readonly inventorySubService: InventorySubService) {}

  @Post()
  @ApiOperation({ summary: "Tạo tiểu ban kiểm kê mới" })
  @ApiResponse({
    status: 201,
    description: "Tiểu ban được tạo thành công",
    type: InventorySubResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy cơ sở tham gia" })
  @ApiResponse({ status: 409, description: "Cơ sở đã có tiểu ban" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_INVENTORY)
  @ApiBearerAuth()
  async create(
    @Body() createInventorySubDto: CreateInventorySubDto,
    @CurrentUser() currentUser: User
  ): Promise<InventorySubResponseDto> {
    return this.inventorySubService.create(createInventorySubDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: "Lấy danh sách tất cả tiểu ban" })
  @ApiQuery({ name: "sessionId", required: false, description: "Lọc theo kỳ kiểm kê" })
  @ApiQuery({ name: "status", required: false, description: "Lọc theo trạng thái" })
  @ApiResponse({
    status: 200,
    description: "Danh sách tiểu ban",
    type: [InventorySubResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: string
  ): Promise<InventorySubResponseDto[]> {
    return this.inventorySubService.findAll(sessionId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: "Lấy thông tin tiểu ban theo ID" })
  @ApiParam({ name: "id", description: "ID của tiểu ban", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Thông tin tiểu ban",
    type: InventorySubResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(@Param('id') id: string): Promise<InventorySubResponseDto> {
    return this.inventorySubService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Cập nhật thông tin tiểu ban" })
  @ApiParam({ name: "id", description: "ID của tiểu ban", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Tiểu ban được cập nhật thành công",
    type: InventorySubResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateInventorySubDto: UpdateInventorySubDto,
    @CurrentUser() currentUser: User
  ): Promise<InventorySubResponseDto> {
    return this.inventorySubService.update(id, updateInventorySubDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa tiểu ban" })
  @ApiParam({ name: "id", description: "ID của tiểu ban", type: "string" })
  @ApiResponse({ status: 204, description: "Tiểu ban được xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban" })
  @ApiResponse({ status: 400, description: "Không thể xóa tiểu ban đang hoạt động" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_INVENTORY)
  @ApiBearerAuth()
  async remove(@Param('id') id: string): Promise<void> {
    return this.inventorySubService.remove(id);
  }

  @Get('by-session-unit/:sessionUnitId')
  @ApiOperation({ summary: "Lấy tiểu ban theo cơ sở tham gia" })
  @ApiParam({ name: "sessionUnitId", description: "ID của cơ sở tham gia", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Thông tin tiểu ban của cơ sở",
    type: InventorySubResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findBySessionUnit(@Param('sessionUnitId') sessionUnitId: string): Promise<InventorySubResponseDto> {
    return this.inventorySubService.findBySessionUnit(sessionUnitId);
  }
}
