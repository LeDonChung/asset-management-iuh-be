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
} from "@nestjs/common";
import { InventoriesService } from "./inventories.service";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventorySessionResponseDto } from "./dto/inventory-response.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { InventorySessionMemberResponseDto } from "./dto/member-response.dto";
import { InventoryFilterDto } from "./dto/inventory-filter.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { User } from "src/entities/user.entity";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { InventorySessionStatus } from "src/common/shared/InventorySessionStatus";
import { InventoryGroupAssignmentDto } from "../inventory-group/dto/inventory-group-response.dto";
import { SaveTempInventoryDto } from "./dto/save-temp-inventory.dto";
import { TempInventoryResponseDto } from "./dto/temp-inventory-response.dto";
import { SubmitInventoryResultDto } from "./dto/submit-inventory-result.dto";
import { SubmitInventoryResultResponseDto } from "./dto/submit-inventory-result-response.dto";
import { SaveTempAdjacentInventoryDto } from "./dto/save-temp-adjacent-inventory.dto";
import { TempAdjacentInventoryResponseDto } from "./dto/temp-adjacent-inventory-response.dto";

@ApiTags("Inventories")
@Controller("api/v1/inventories")
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  // Lấy danh sách kì kiểm kê đang được phân công
  @Get("assigned")
  @ApiOperation({ summary: "Lấy danh sách kì kiểm kê đang được phân công" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kì kiểm kê đang được phân công",
    type: [InventorySessionResponseDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async getAssignedInventories(@CurrentUser() currentUser: User): Promise<InventorySessionResponseDto[]> {
    return this.inventoriesService.getAssignedInventories(currentUser);
  }

  // Lấy danh sách được phân công trong kỳ cụ thể
  @Get(":id/assigned-members/:groupId")
  @ApiOperation({ summary: "Lấy danh sách được phân công trong kỳ kiểm kê cụ thể" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiParam({ name: "groupId", description: "ID của nhóm", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Danh sách được phân công trong kỳ kiểm kê",
    type: Object,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async getAssignedMembersInSession(
    @Param("id") inventorySessionId: string,
    @Param("groupId") groupId: string,
  ): Promise<InventoryGroupAssignmentDto[]> {
    return this.inventoriesService.getAssignedMembersInSession(
      inventorySessionId,
      groupId,
    );
  }
  
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

  @Post('filter')
  @ApiOperation({ summary: "Lấy danh sách tất cả kỳ kiểm kê với bộ lọc và phân trang" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kỳ kiểm kê với phân trang",
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async findAll(@Body() filterDto: InventoryFilterDto): Promise<PaginatedResponseDto<InventorySessionResponseDto>> {
    return this.inventoriesService.findAllWithFilter(filterDto);
  }

  @Get('/simple')
  @ApiOperation({ summary: "Lấy danh sách đơn giản kỳ kiểm kê (không có filter)" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kỳ kiểm kê",
    type: [InventorySessionResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async findAllSimple(): Promise<InventorySessionResponseDto[]> {
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

  @Patch(":id/status")
  @ApiOperation({ summary: "Cập nhật trạng thái kỳ kiểm kê" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({ status: 200, description: "Trạng thái kỳ kiểm kê được cập nhật thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  @ApiQuery({ name: "status", description: "Trạng thái kỳ kiểm kê", type: "string", enum: InventorySessionStatus })
  async updateStatus(@Param("id") id: string, @Query("status") status: InventorySessionStatus): Promise<boolean> {
    return this.inventoriesService.updateStatus(id, status);
  }

  // === MEMBER MANAGEMENT ENDPOINTS ===

  @Post(":id/members")
  @ApiOperation({ summary: "Thêm thành viên vào ban kiểm kê chính" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({
    status: 201,
    description: "Thành viên được thêm thành công",
    type: InventorySessionMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 409, description: "Thành viên đã tồn tại trong ban kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async addMember(
    @Param("id") inventorySessionId: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() currentUser: User
  ): Promise<InventorySessionMemberResponseDto> {
    return this.inventoriesService.addMember(inventorySessionId, addMemberDto, currentUser);
  }

  @Get(":id/members")
  @ApiOperation({ summary: "Lấy danh sách thành viên ban kiểm kê chính" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Danh sách thành viên ban kiểm kê",
    type: [InventorySessionMemberResponseDto],
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async getMembers(
    @Param("id") inventorySessionId: string
  ): Promise<InventorySessionMemberResponseDto[]> {
    return this.inventoriesService.getMembers(inventorySessionId);
  }

  @Patch(":id/members/:memberId")
  @ApiOperation({ summary: "Cập nhật thông tin thành viên ban kiểm kê" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiParam({ name: "memberId", description: "ID của thành viên", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Thông tin thành viên được cập nhật thành công",
    type: InventorySessionMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy thành viên" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async updateMember(
    @Param("id") inventorySessionId: string,
    @Param("memberId") memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @CurrentUser() currentUser: User
  ): Promise<InventorySessionMemberResponseDto> {
    return this.inventoriesService.updateMember(inventorySessionId, memberId, updateMemberDto, currentUser);
  }

  @Delete(":id/members/:memberId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa thành viên khỏi ban kiểm kê chính" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiParam({ name: "memberId", description: "ID của thành viên", type: "string" })
  @ApiResponse({ status: 204, description: "Thành viên được xóa thành công" })
  @ApiResponse({ status: 404, description: "Không tìm thấy thành viên" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_INVENTORY)
  @ApiBearerAuth()
  async removeMember(
    @Param("id") inventorySessionId: string,
    @Param("memberId") memberId: string
  ): Promise<void> {
    return this.inventoriesService.removeMember(inventorySessionId, memberId);
  }

  @Get(":id/members/by-role/:role")
  @ApiOperation({ summary: "Lấy danh sách thành viên theo vai trò" })
  @ApiParam({ name: "id", description: "ID của kỳ kiểm kê", type: "string" })
  @ApiParam({ name: "role", description: "Vai trò (LEADER, SECRETARY, MEMBER)", enum: ["LEADER", "SECRETARY", "MEMBER"] })
  @ApiResponse({
    status: 200,
    description: "Danh sách thành viên theo vai trò",
    type: [InventorySessionMemberResponseDto],
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kỳ kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_INVENTORY)
  @ApiBearerAuth()
  async getMembersByRole(
    @Param("id") inventorySessionId: string,
    @Param("role") role: string
  ): Promise<InventorySessionMemberResponseDto[]> {
    return this.inventoriesService.getMembersByRole(inventorySessionId, role);
  }

  // === TEMPORARY INVENTORY RESULTS ENDPOINTS ===

  @Post("temp-results")
  @ApiOperation({ summary: "Lưu kết quả kiểm kê tạm thời vào Redis" })
  @ApiResponse({
    status: 201,
    description: "Kết quả kiểm kê tạm thời được lưu thành công",
    type: TempInventoryResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async saveTempInventoryResults(
    @Body() saveTempInventoryDto: SaveTempInventoryDto
  ): Promise<TempInventoryResponseDto> {
    return this.inventoriesService.saveTempInventoryResults(saveTempInventoryDto);
  }

  @Get("temp-results/:roomId")
  @ApiOperation({ summary: "Lấy kết quả kiểm kê tạm thời theo roomId" })
  @ApiParam({ name: "roomId", description: "ID của phòng", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Kết quả kiểm kê tạm thời",
    type: TempInventoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kết quả kiểm kê tạm thời" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getTempInventoryResults(
    @Param("roomId") roomId: string
  ): Promise<TempInventoryResponseDto | null> {
    return this.inventoriesService.getTempInventoryResults(roomId);
  }

  @Delete("temp-results/:roomId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa kết quả kiểm kê tạm thời theo roomId" })
  @ApiParam({ name: "roomId", description: "ID của phòng", type: "string" })
  @ApiResponse({ status: 204, description: "Kết quả kiểm kê tạm thời được xóa thành công" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async deleteTempInventoryResults(@Param("roomId") roomId: string): Promise<void> {
    await this.inventoriesService.deleteTempInventoryResults(roomId);
  }

  @Get("temp-results")
  @ApiOperation({ summary: "Lấy tất cả kết quả kiểm kê tạm thời" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kết quả kiểm kê tạm thời",
    type: [TempInventoryResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getAllTempInventoryResults(): Promise<TempInventoryResponseDto[]> {
    return this.inventoriesService.getAllTempInventoryResults();
  }

  // === INVENTORY RESULT SUBMISSION ENDPOINTS ===

  @Post("submit-result")
  @ApiOperation({ summary: "Submit kết quả kiểm kê chính thức" })
  @ApiResponse({
    status: 201,
    description: "Kết quả kiểm kê được submit thành công",
    type: SubmitInventoryResultResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 404, description: "Không tìm thấy phân công kiểm kê hoặc tài sản" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async submitInventoryResult(
    @Body() submitDto: SubmitInventoryResultDto,
    @CurrentUser() currentUser: User
  ): Promise<SubmitInventoryResultResponseDto> {
    return this.inventoriesService.submitInventoryResult(submitDto, currentUser);
  }

  @Get("rooms-inventory-status/:assignmentId")
  @ApiOperation({ summary: "Lấy trạng thái kiểm kê của các phòng trong phân công" })
  @ApiParam({ name: "assignmentId", description: "ID của phân công kiểm kê", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Danh sách trạng thái kiểm kê của các phòng",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          roomId: { type: "string" },
          status: { type: "boolean" }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy phân công kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getRoomsInventoryStatus(@Param("assignmentId") assignmentId: string) {
    return this.inventoriesService.getRoomsInventoryStatus(assignmentId);
  }

  @Get("room-inventory-results/:roomId/:assignmentId")
  @ApiOperation({ summary: "Lấy kết quả kiểm kê của một phòng cụ thể" })
  @ApiParam({ name: "roomId", description: "ID của phòng", type: "string" })
  @ApiParam({ name: "assignmentId", description: "ID của phân công kiểm kê", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Kết quả kiểm kê của phòng",
    type: [TempInventoryResponseDto],
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy phòng hoặc phân công kiểm kê" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getRoomInventoryResults(
    @Param("roomId") roomId: string,
    @Param("assignmentId") assignmentId: string
  ) {
    return this.inventoriesService.getRoomInventoryResults(roomId, assignmentId);
  }

  // === TEMPORARY ADJACENT INVENTORY RESULTS ENDPOINTS ===

  @Post("temp-adjacent-results")
  @ApiOperation({ summary: "Lưu kết quả kiểm kê tạm thời tài sản hàng xóm vào Redis" })
  @ApiResponse({
    status: 201,
    description: "Kết quả kiểm kê tạm thời tài sản hàng xóm được lưu thành công",
    type: TempAdjacentInventoryResponseDto,
  })
  @ApiResponse({ status: 400, description: "Dữ liệu đầu vào không hợp lệ" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async saveTempAdjacentInventoryResults(
    @Body() saveTempAdjacentDto: SaveTempAdjacentInventoryDto
  ): Promise<TempAdjacentInventoryResponseDto> {
    return this.inventoriesService.saveTempAdjacentInventoryResults(saveTempAdjacentDto);
  }

  @Get("temp-adjacent-results/:roomId")
  @ApiOperation({ summary: "Lấy kết quả kiểm kê tạm thời tài sản hàng xóm theo roomId" })
  @ApiParam({ name: "roomId", description: "ID của phòng", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Kết quả kiểm kê tạm thời tài sản hàng xóm",
    type: TempAdjacentInventoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy kết quả kiểm kê tạm thời tài sản hàng xóm" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getTempAdjacentInventoryResults(
    @Param("roomId") roomId: string
  ): Promise<TempAdjacentInventoryResponseDto | null> {
    return this.inventoriesService.getTempInventoryAdjacentResults(roomId);
  }

  @Delete("temp-adjacent-results/:roomId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xóa kết quả kiểm kê tạm thời tài sản hàng xóm theo roomId" })
  @ApiParam({ name: "roomId", description: "ID của phòng", type: "string" })
  @ApiResponse({ status: 204, description: "Kết quả kiểm kê tạm thời tài sản hàng xóm được xóa thành công" })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async deleteTempAdjacentInventoryResults(@Param("roomId") roomId: string): Promise<void> {
    await this.inventoriesService.deleteTempAdjacentInventoryResults(roomId);
  }

  @Get("temp-adjacent-results")
  @ApiOperation({ summary: "Lấy tất cả kết quả kiểm kê tạm thời tài sản hàng xóm" })
  @ApiResponse({
    status: 200,
    description: "Danh sách kết quả kiểm kê tạm thời tài sản hàng xóm",
    type: [TempAdjacentInventoryResponseDto],
  })
  @ApiResponse({ status: 500, description: "Lỗi server" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async getAllTempAdjacentInventoryResults(): Promise<TempAdjacentInventoryResponseDto[]> {
    return this.inventoriesService.getAllTempAdjacentInventoryResults();
  }

  
}
