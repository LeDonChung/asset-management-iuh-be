import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user'
    })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'Email address'
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: '+84901234567',
        description: 'Phone number',
        required: false
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({
        example: '1990-01-01',
        description: 'Birth date in YYYY-MM-DD format',
        required: false
    })
    @IsOptional()
    @IsDateString({}, { message: 'Birth date must be a valid date string (YYYY-MM-DD)' })
    birthDate?: string;
}