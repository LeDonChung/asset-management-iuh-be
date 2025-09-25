import { Body, Controller, HttpCode, HttpStatus, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dtos/login.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { PermissionConstants } from 'src/common/utils/permission.constant';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { UpdateProfileDto } from './dtos/user-profile.dto';
import { UserProfileResponseDto } from './dtos/user-profile-response.dto';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @UseGuards(LoginAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            type: 'object',
            properties: {
                access_token: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        roles: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    /**
     * Change user password
     * @description Change user password based on the provided ChangePasswordDto.
     * @param changePasswordDto Data Transfer Object containing username, current password, new password, and confirm password
     * @returns 
     */
    @Put('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async changePassword(@Body() changePasswordDto: ChangePasswordDto, @CurrentUser() user: User): Promise<{ message: string }> {
        return this.authService.changePassword(changePasswordDto, user);
    }

    @Patch('update-profile')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async updateProfile(@Body() updateProfileDto: UpdateProfileDto, @CurrentUser() user: User): Promise<UserProfileResponseDto> {
        return this.authService.updateProfile(updateProfileDto, user);
    }
}
