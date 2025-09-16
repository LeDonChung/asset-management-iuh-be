import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User, UserStatus } from "src/entities/user.entity";
import { errorResponse } from "src/common/helpers/error-response";
import * as bcrypt from "bcryptjs";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { LoginDto } from "./dtos/login.dto";
import { ChangePasswordDto } from "./dtos/change-password.dto";
import { UserProfileResponseDto } from "./dtos/user-profile-response.dto";
import { UpdateProfileDto } from "./dtos/user-profile.dto";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly logger: Logger,
    ) { }
    async login(
        loginDto: LoginDto,
    ): Promise<{ user: Omit<User, 'password'>; token: string }> {
        try {
            const { username, password } = loginDto;

            const user = await this.validateUser(username, password);
            if (!user) {
                throw new UnauthorizedException(errorResponse('INVALID_CREDENTIALS', 'Invalid credentials'));
            }

            const roles = user.roles.map(role => role.code);
            const permissions = user.roles.flatMap(role => role.permissions?.map(p => p.code) ?? []);

            // Generate JWT token
            const payload: JwtPayload = {
                sub: user.id,
                email: user.email,
                roles: roles,
                fullName: user.fullName,
                permissions: permissions,
            };

            const token = this.jwtService.sign(payload);

            const { password: _, ...userWithoutPassword } = user;

            return { user: userWithoutPassword, token };
        } catch (e) {
            this.logger.error(e, 'Login error:');
            throw e;
        }
    }

    async validateUser(username: string, password: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { username, status: UserStatus.ACTIVE },
            relations: ['roles', 'roles.permissions', 'unit'],
        });
        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    }

    async findUserById(sub: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: sub, status: UserStatus.ACTIVE },
            relations: ['roles', 'roles.permissions'],
        });
        if (!user) {
            throw new UnauthorizedException(
                errorResponse("NOT_FOUND", "User not found or inactive")
            );
        }
        return user;
    }

    /**
     * Change user password
     * @description Change user password based on the provided ChangePasswordDto.
     * @param changePasswordDto Data Transfer Object containing username, current password, new password, and confirm password
     * @param currentUser 
     * @returns A message indicating the result of the password change operation
     */
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

    /**
     * Update user profile
     * @description Update user profile based on the provided UpdateProfileDto.
     * @param updateProfileDto Data to update user profile
     * @param currentUser 
     * @returns 
     */
    async updateProfile(
        updateProfileDto: UpdateProfileDto,
        currentUser?: User
    ): Promise<UserProfileResponseDto> {
        if(!currentUser?.id) {
            throw new UnauthorizedException(
                errorResponse("UNAUTHORIZED", "User not authenticated")
            );
        }

        let user = await this.userRepository.findOneById(currentUser.id);

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
}
