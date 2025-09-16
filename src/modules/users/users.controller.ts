import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionConstants } from 'src/common/utils/permission.constant';

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

    /**
     * Update user information
     * @description Update user details based on the provided UpdateUserDto.
     * @param updateUserDto Data to update user information
     * @returns Updated user information
     */
    @Patch()
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, type: UserResponseDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_UPDATE_USER)
    @ApiBearerAuth()
    async updateUser(@Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
        return this.usersService.update(updateUserDto);
    }
}
