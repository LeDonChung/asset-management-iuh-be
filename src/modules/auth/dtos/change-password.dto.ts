import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
    @ApiProperty({
        example: 'oldPassword123!',
        description: 'Current password'
    })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({
        example: 'NewPassword123!',
        description: 'New password - Minimum 8 characters with uppercase, lowercase, number and special character',
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
        {
            message: 'New password must contain at least: 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*)'
        }
    )
    newPassword: string;

    @ApiProperty({
        example: 'NewPassword123!',
        description: 'Confirm new password'
    })
    @IsString()
    @IsNotEmpty()
    confirmPassword: string;
}
