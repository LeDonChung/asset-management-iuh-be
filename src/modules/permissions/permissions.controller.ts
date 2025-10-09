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
import { PermissionsService } from "./permissions.service";
import { CreateManagerPermissionDto } from "./dtos/create-manager-permission.dto";
import { UpdateManagerPermissionDto } from "./dtos/update-manager-permission.dto";
import {
  ManagerPermissionResponseDto,
  PermissionResponseDto,
} from "./dtos/manager-permission-response.dto";
import { ApiBearerAuth, ApiBody, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";

@Controller("api/v1/manager-permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateManagerPermissionDto })
  @ApiResponse({ status: 201, type: ManagerPermissionResponseDto })
  @ApiResponse({ status: 400, description: "Invalid data" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_PERMISSION)
  @ApiBearerAuth()
  async create(
    @Body() createDto: CreateManagerPermissionDto
  ): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [ManagerPermissionResponseDto] })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(): Promise<ManagerPermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: ManagerPermissionResponseDto })
  @ApiResponse({ status: 404, description: "Permission not found" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(
    @Param("id") id: string
  ): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateManagerPermissionDto })
  @ApiResponse({ status: 200, type: ManagerPermissionResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_PERMISSION)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateManagerPermissionDto
  ): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.update(id, updateDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_PERMISSION)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.permissionsService.remove(id);
  }
}
