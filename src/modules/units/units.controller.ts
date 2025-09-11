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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionConstants } from 'src/common/utils/permission.constant';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Units')
@Controller('api/v1/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiResponse({
    status: 201,
    description: 'Unit created successfully',
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_CREATE_UNIT)
  @ApiBearerAuth()
  async create(@Body() createUnitDto: CreateUnitDto, @CurrentUser() currentUser: User): Promise<UnitResponseDto> {
    return this.unitsService.create(createUnitDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all units' })
  @ApiResponse({
    status: 200,
    description: 'Units retrieved successfully',
    type: [UnitResponseDto],
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_UNIT)
  @ApiBearerAuth()
  async findAll(): Promise<UnitResponseDto[]> {
    return this.unitsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit by ID' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unit retrieved successfully',
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_VIEW_UNIT)
  @ApiBearerAuth()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnitResponseDto> {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update unit by ID' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unit updated successfully',
    type: UnitResponseDto,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionConstants.PERM_UPDATE_UNIT)
  @ApiBearerAuth()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ): Promise<UnitResponseDto> {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete unit by ID' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({
    status: 204,
    description: 'Unit deleted successfully',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.unitsService.remove(id);
  }
}
