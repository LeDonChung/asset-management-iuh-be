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
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import {
  RoleResponseDto,
} from "./dto/role-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@ApiTags("Roles")
@Controller("api/v1/roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * create
   * @description Tạo vai trò mới
   * @param createRoleDto Dữ liệu để tạo vai trò mới
   * @returns Vai trò đã được tạo dưới dạng RoleResponseDto
   * @throws BadRequestException Nếu vai trò với tên đã tồn tại
   * @throws NotFoundException Nếu bất kỳ quyền nào trong danh sách không tồn tại
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBadRequestResponse({ description: "Bad Request" })
  @ApiNotFoundResponse({ description: "Not Found" })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_ROLE)
  @ApiBearerAuth()
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  /**
   * findAll
   * @description Lấy tất cả các vai trò
   * @returns Danh sách tất cả vai trò
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ROLE)
  @ApiBearerAuth()
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  /**
   * findAllInventoryRoles
   * @description Lấy tất cả các vai trò dành cho kiểm kê
   * @returns Danh sách vai trò dành cho kiểm kê
   */
  @Get("inventory")
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAllInventoryRoles(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAllInventoryRoles();
  }

  /**
   * findOne
   * @description Lấy một vai trò theo ID
   * @param id ID của vai trò cần lấy
   * @returns Vai trò dưới dạng RoleResponseDto
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: "Not Found" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_ROLE)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  /**
   * update
   * @description Cập nhật vai trò theo ID
   * @param id ID của vai trò cần cập nhật
   * @param updateRoleDto Dữ liệu để cập nhật vai trò
   * @returns Vai trò đã được cập nhật dưới dạng RoleResponseDto
   * @throws NotFoundException Nếu vai trò với ID không tồn tại
   * @throws BadRequestException Nếu vai trò với tên đã tồn tại
   * @throws NotFoundException Nếu bất kỳ quyền nào trong danh sách không tồn tại
   */
  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateRoleDto })
  @ApiBadRequestResponse({ description: "Bad Request" })
  @ApiNotFoundResponse({ description: "Not Found" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_ROLE)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto);
  }

  /**
   * remove
   * @description Xóa vai trò theo ID
   * @param id ID của vai trò cần xóa
   * @returns None
   * @throws NotFoundException Nếu vai trò với ID không tồn tại
   * @throws BadRequestException Nếu vai trò đang được sử dụng bởi người dùng hoặc các thực thể khác
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_ROLE)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}
