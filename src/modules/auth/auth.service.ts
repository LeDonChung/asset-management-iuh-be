import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User, UserStatus } from "src/entities/user.entity";
import { errorResponse } from "src/common/helpers/error-response";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { LoginDto } from "./dtos/login.dto";
import { ChangePasswordDto } from "./dtos/change-password.dto";
import { UserProfileResponseDto } from "./dtos/user-profile-response.dto";
import { UpdateProfileDto } from "./dtos/user-profile.dto";
import { UserResponseDto } from "../users/dto/user-response.dto";
import { UserLoginResponse } from "./dtos/user-login-response.dto";
import { ForgotPasswordDto } from "./dtos/forgot-password.dto";
import { ResetPasswordDto } from "./dtos/reset-password.dto";
import { RedisService } from "../redis/redis.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly logger: Logger,
        private readonly redisService: RedisService,
        private readonly emailService: EmailService,
    ) { }
    async login(
        loginDto: LoginDto,
    ): Promise<{ user: Omit<UserLoginResponse, 'password'>; token: string }> {
        try {
            const { username, password } = loginDto;

            const user = await this.validateUser(username, password);
            if (!user) {
                throw new UnauthorizedException(errorResponse('INVALID_CREDENTIALS', 'Invalid credentials'));
            }

            const roles = user.roles.map(role => role.code);
            const permissions = user.roles.flatMap(role => role.permissions?.map(p => p.code) ?? []);
            const accessScopeTypes = user.roles.map(role => role.accessScope?.type).filter(Boolean);

            // Generate JWT token
            const payload: JwtPayload = {
                sub: user.id,
                email: user.email,
                roles: roles,
                fullName: user.fullName,
                unitId: user.unitId,
                permissions: permissions,
                accessScopeTypes: accessScopeTypes,
            };

            const token = this.jwtService.sign(payload);
            const userLogin: UserLoginResponse = {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                roles: roles,
                permissions: permissions,
                accessScopeTypes: accessScopeTypes,
                email: user.email,
                phoneNumber: user.phoneNumber,
                birthDate: user.birthDate,
                unitId: user.unitId,
                unitName: user.unit?.name,
            }
        
            return { user: userLogin, token };
        } catch (e) {
            this.logger.error(e, 'Login error:');
            throw e;
        }
    }

    async validateUser(username: string, password: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { username, status: UserStatus.ACTIVE },
            relations: ['roles', 'roles.permissions', 'roles.accessScope', 'unit'],
        });
        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    }

    async findUserById(sub: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: sub, status: UserStatus.ACTIVE },
            relations: ['roles', 'roles.permissions', 'roles.accessScope'],
        });
        if (!user) {
            throw new UnauthorizedException(
                errorResponse("NOT_FOUND", "User not found or inactive")
            );
        }
        return user;
    }

    async changePassword(
        changePasswordDto: ChangePasswordDto,
        currentUser?: User
    ): Promise<{ message: string }> {

        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new BadRequestException(
                errorResponse("PASSWORD_MISMATCH", "New password and confirm password do not match")
            );
        }

        if(!currentUser?.id) {
            throw new UnauthorizedException(
                errorResponse("UNAUTHORIZED", "User not authenticated")
            );
        }

        let user = await this.userRepository.findOne({
            where: { id: currentUser.id, status: UserStatus.ACTIVE },
        });

        if (!user) {
            throw new UnauthorizedException(
                errorResponse("NOT_FOUND", "User not found or inactive")
            );
        }

        const isMatch = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException(
                errorResponse("INVALID_CREDENTIALS", "Invalid current password")
            );
        }

        user.password = await bcrypt.hash(changePasswordDto.newPassword, 12);
        await this.userRepository.save(user);

        return { message: 'Password changed successfully' };
    }

    async updateProfile(
        updateProfileDto: UpdateProfileDto,
        currentUser?: User
    ): Promise<UserProfileResponseDto> {
        if(!currentUser?.id) {
            throw new UnauthorizedException(
                errorResponse("UNAUTHORIZED", "User not authenticated")
            );
        }

        let user = await this.userRepository.findOne({
            where: { id: currentUser.id, status: UserStatus.ACTIVE },
        });

        if (!user) {
            throw new UnauthorizedException(
                errorResponse("NOT_FOUND", "User not found or inactive")
            );
        }

        user.fullName = updateProfileDto.fullName;
        user.email = updateProfileDto.email;
        user.phoneNumber = updateProfileDto.phoneNumber;
        user.birthDate = updateProfileDto.birthDate;

        user = await this.userRepository.save(user);

        return {
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            birthDate: user.birthDate,
        };
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        const { email } = forgotPasswordDto;

        // Find user by email
        const user = await this.userRepository.findOne({
            where: { email, status: UserStatus.ACTIVE },
        });

        if (!user) {
            // Don't reveal if email exists or not for security reasons
            return { message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
        }

        try {
            // Generate secure reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenKey = `reset_password:${resetToken}`;

            // Store token in Redis with 5 minutes expiration
            await this.redisService.set(resetTokenKey, {
                userId: user.id,
                email: user.email,
                createdAt: new Date().toISOString(),
            }, 300); // 5 minutes = 300 seconds

            // Send reset password email
            const emailSent = await this.emailService.sendResetPasswordEmail(
                user.email,
                resetToken,
                user.fullName
            );

            if (!emailSent) {
                this.logger.warn(`Failed to send reset password email to ${user.email}`);
            }

            return { message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
        } catch (error) {
            this.logger.error('Error in forgotPassword:', error);
            throw new BadRequestException(
                errorResponse("INTERNAL_ERROR", "Đã xảy ra lỗi khi xử lý yêu cầu đặt lại mật khẩu")
            );
        }
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const { token, newPassword, confirmPassword } = resetPasswordDto;

        // Validate password confirmation
        if (newPassword !== confirmPassword) {
            throw new BadRequestException(
                errorResponse("PASSWORD_MISMATCH", "Mật khẩu mới và xác nhận mật khẩu không khớp")
            );
        }

        const resetTokenKey = `reset_password:${token}`;

        try {
            // Get token data from Redis
            const tokenData = await this.redisService.get(resetTokenKey);

            if (!tokenData) {
                throw new BadRequestException(
                    errorResponse("INVALID_TOKEN", "Token không hợp lệ hoặc đã hết hạn")
                );
            }

            // Find user
            const user = await this.userRepository.findOne({
                where: { 
                    id: tokenData.userId, 
                    email: tokenData.email,
                    status: UserStatus.ACTIVE 
                },
            });

            if (!user) {
                throw new BadRequestException(
                    errorResponse("USER_NOT_FOUND", "Người dùng không tồn tại hoặc không hoạt động")
                );
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update user password
            user.password = hashedPassword;
            await this.userRepository.save(user);

            // Remove token from Redis
            await this.redisService.del(resetTokenKey);

            this.logger.log(`Password reset successfully for user: ${user.email}`);

            return { message: 'Mật khẩu đã được đặt lại thành công' };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
                throw error;
            }

            this.logger.error('Error in resetPassword:', error);
            throw new BadRequestException(
                errorResponse("INTERNAL_ERROR", "Đã xảy ra lỗi khi đặt lại mật khẩu")
            );
        }
    }
}
