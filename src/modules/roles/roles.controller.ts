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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get("inventory")
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAllInventoryRoles(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAllInventoryRoles();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: "Not Found" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

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

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_ROLE)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}
