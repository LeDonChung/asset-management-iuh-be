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
import { InventoryGroupService } from './inventory-group.service';
import { CreateInventoryGroupDto } from './dto/create-inventory-group.dto';
import { UpdateInventoryGroupDto } from './dto/update-inventory-group.dto';
import { InventoryGroupResponseDto } from './dto/inventory-group-response.dto';
import { User } from "src/entities/user.entity";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Inventory Group")
@Controller('api/v1/inventory-group')
export class InventoryGroupController {
  constructor(private readonly inventoryGroupService: InventoryGroupService) {}

  @Post()
  @ApiOperation({ summary: "Tạo nhóm kiểm kê mới" })
  @ApiResponse({
    status: 201,
    description: "Nhóm được tạo thành công",
    type: InventoryGroupResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban hoặc đơn vị" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_INVENTORY)
  @ApiBearerAuth()
  async create(
    @Body() createInventoryGroupDto: CreateInventoryGroupDto,
    @CurrentUser() currentUser: User
  ): Promise<InventoryGroupResponseDto> {
    return this.inventoryGroupService.create(createInventoryGroupDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: "Lấy danh sách tất cả nhóm kiểm kê" })
  @ApiQuery({ name: "subId", required: false, description: "Lọc theo tiểu ban" })
  @ApiQuery({ name: "status", required: false, description: "Lọc theo trạng thái" })
  @ApiResponse({
    status: 200,
    description: "Danh sách nhóm kiểm kê",
    type: [InventoryGroupResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(
    @Query('subId') subId?: string,
    @Query('status') status?: string
  ): Promise<InventoryGroupResponseDto[]> {
    return this.inventoryGroupService.findAll(subId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: "Lấy thông tin nhóm kiểm kê theo ID" })
  @ApiParam({ name: "id", description: "ID của nhóm", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Thông tin nhóm kiểm kê",
    type: InventoryGroupResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy nhóm" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(@Param('id') id: string): Promise<InventoryGroupResponseDto> {
    return this.inventoryGroupService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Cập nhật thông tin nhóm kiểm kê" })
  @ApiParam({ name: "id", description: "ID của nhóm", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Nhóm được cập nhật thành công",
    type: InventoryGroupResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy nhóm" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateInventoryGroupDto: UpdateInventoryGroupDto,
    @CurrentUser() currentUser: User
  ): Promise<InventoryGroupResponseDto> {
    return this.inventoryGroupService.update(id, updateInventoryGroupDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa nhóm kiểm kê" })
  @ApiParam({ name: "id", description: "ID của nhóm", type: "string" })
  @ApiResponse({ status: 204, description: "Nhóm được xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy nhóm" })
  @ApiResponse({ status: 400, description: "Không thể xóa nhóm đang hoạt động" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_INVENTORY)
  @ApiBearerAuth()
  async remove(@Param('id') id: string): Promise<void> {
    return this.inventoryGroupService.remove(id);
  }

  @Get('by-sub/:subId')
  @ApiOperation({ summary: "Lấy danh sách nhóm theo tiểu ban" })
  @ApiParam({ name: "subId", description: "ID của tiểu ban", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Danh sách nhóm của tiểu ban",
    type: [InventoryGroupResponseDto],
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy tiểu ban" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findBySub(@Param('subId') subId: string): Promise<InventoryGroupResponseDto[]> {
    return this.inventoryGroupService.findBySub(subId);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: "Lấy danh sách phân công đơn vị của nhóm" })
  @ApiParam({ name: "id", description: "ID của nhóm", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Danh sách phân công đơn vị",
    type: InventoryGroupResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy nhóm" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getAssignments(@Param('id') id: string): Promise<InventoryGroupResponseDto> {
    return this.inventoryGroupService.findOne(id);
  }
}
