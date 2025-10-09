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
import { RoomsService } from "./rooms.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { RoomResponseDto } from "./dto/room-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";

@ApiTags("Rooms")
@Controller("api/v1/rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new room" })
  @ApiResponse({
    status: 201,
    description: "Room created successfully",
    type: RoomResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_UNIT)
  @ApiBearerAuth()
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: User
  ): Promise<RoomResponseDto> {
    return this.roomsService.create(createRoomDto, user);
  }

  @Get()
  @ApiOperation({ summary: "Get all rooms with pagination" })
  @ApiResponse({
    status: 200,
    description: "Rooms retrieved successfully",
    type: [RoomResponseDto],
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findAll(): Promise<RoomResponseDto[]> {
    return this.roomsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get room by ID" })
  @ApiParam({ name: "id", description: "Room ID" })
  @ApiResponse({
    status: 200,
    description: "Room retrieved successfully",
    type: RoomResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async findOne(@Param("id") id: string): Promise<RoomResponseDto> {
    return this.roomsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update room by ID" })
  @ApiParam({ name: "id", description: "Room ID" })
  @ApiResponse({
    status: 200,
    description: "Room updated successfully",
    type: RoomResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_UNIT)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateRoomDto: UpdateRoomDto
  ): Promise<RoomResponseDto> {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete room by ID (soft delete)" })
  @ApiParam({ name: "id", description: "Room ID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_REMOVE_UNIT)
  @ApiBearerAuth()
  async remove(@Param("id") id: string): Promise<void> {
    return this.roomsService.remove(id);
  }
}
