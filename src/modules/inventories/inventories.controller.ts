import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from "@nestjs/common";
import { InventoriesService } from "./inventories.service";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventorySessionResponseDto } from "./dto/inventory-response.dto";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { User } from "src/entities/user.entity";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Inventories")
@Controller("api/v1/inventories")
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post()
  @ApiOperation({ summary: "Tạo kỳ kiểm kê mới" })
  @ApiResponse({
    status: 201,
    description: "Kỳ kiểm kê được tạo thành công",
    type: InventorySessionResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 401, description: "Người dùng không hợp lệ" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_INVENTORY)
  @ApiBearerAuth()
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
    @CurrentUser() currentUser: User
  ): Promise<InventorySessionResponseDto> {
    return this.inventoriesService.create(createInventoryDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: "Lấy danh sách tất cả kỳ kiểm kê" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kỳ kiểm kê",
    type: [InventorySessionResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async findAll(): Promise<InventorySessionResponseDto[]> {
    return this.inventoriesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin kỳ kiểm kê theo ID" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Thông tin kỳ kiểm kê",
    type: InventorySessionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<InventorySessionResponseDto> {
    return this.inventoriesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật thông tin kỳ kiểm kê" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Kỳ kiểm kê được cập nhật thành công",
    type: InventorySessionResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateInventoryDto: UpdateInventoryDto
  ): Promise<InventorySessionResponseDto> {
    return this.inventoriesService.update(id, updateInventoryDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa kỳ kiểm kê" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({ status: 204, description: "Kỳ kiểm kê được xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_INVENTORY)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.inventoriesService.remove(id);
  }
}
