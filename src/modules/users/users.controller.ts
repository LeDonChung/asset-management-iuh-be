import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionConstants } from 'src/common/utils/permission.constant';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@ApiTags('Users')
@Controller('api/v1/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, type: UserResponseDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_CREATE_USER)
    @ApiBearerAuth()
    async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [UserResponseDto] })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_VIEW_USER)
    @ApiBearerAuth()
    async findAll(): Promise<UserResponseDto[]> {
        return this.usersService.findAll();
    }

    @Get('inventory')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [UserResponseDto] })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async findAllUserInventory(): Promise<UserResponseDto[]> {
        return this.usersService.findAllUserInventory();
    }

    @Get('inventory-committee')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ 
        summary: 'Lấy tất cả users có role liên quan đến kiểm kê',
        description: 'Trả về danh sách users có các role codes liên quan đến kiểm kê bao gồm ban kiểm kê chính' 
    })
    @ApiResponse({ 
        status: 200, 
        type: [UserResponseDto],
        description: 'Danh sách users có role liên quan đến kiểm kê'
    })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async findAllInventoryCommitteeUsers(): Promise<UserResponseDto[]> {
        return this.usersService.findAllInventoryCommitteeUsers();
    }

    /**
     * Update user information
     * @description Update user details based on the provided UpdateUserDto.
     * @param updateUserDto Data to update user information
     * @returns Updated user information
     */
    @Patch(':id')
    @ApiOperation({ summary: 'Update user information' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: UpdateUserDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
        return this.usersService.update(id, updateUserDto);
    }

    @Post('filter')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ 
        summary: 'Lấy danh sách users với bộ lọc và phân trang',
        description: 'Trả về danh sách users với các bộ lọc theo unit, status và tìm kiếm theo username, fullName, email' 
    })
    @ApiResponse({ 
        status: 200, 
        type: PaginatedResponseDto,
        description: 'Danh sách users với phân trang'
    })
    @ApiResponse({ status: 500, description: 'Lỗi server' })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_VIEW_USER)
    @ApiBearerAuth()
    async findWithPagination(@Body() filterDto: UserFilterDto): Promise<PaginatedResponseDto<UserResponseDto>> {
        return this.usersService.findWithPagination(filterDto);
    }
}
