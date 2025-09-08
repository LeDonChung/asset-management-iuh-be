import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreateManagerPermissionDto } from './dtos/create-manager-permission.dto';
import { UpdateManagerPermissionDto } from './dtos/update-manager-permission.dto';
import { ManagerPermissionResponseDto, PermissionResponseDto } from './dtos/manager-permission-response.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('api/v1/manager-permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateManagerPermissionDto })
  @ApiResponse({ status: 201, type: ManagerPermissionResponseDto })
  async create(@Body() createDto: CreateManagerPermissionDto): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: [ManagerPermissionResponseDto] })
  async findAll(): Promise<ManagerPermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: ManagerPermissionResponseDto })
  async findOne(@Param('id') id: string): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateManagerPermissionDto })
  @ApiResponse({ status: 200, type: ManagerPermissionResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateManagerPermissionDto
  ): Promise<ManagerPermissionResponseDto> {
    return this.permissionsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.permissionsService.remove(id);
  }
}
