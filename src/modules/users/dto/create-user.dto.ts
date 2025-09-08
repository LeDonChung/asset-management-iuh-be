import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsArray, IsUUID, MinLength, IsDateString, Matches } from "class-validator";
import { UserStatus } from "src/entities/user.entity";

export class CreateUserDto {
  @ApiProperty({ 
    example: 'john_doe', 
    description: 'Username for login',
    minLength: 3
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({ 
    example: 'MyPassword123!', 
    description: 'User password - Minimum 8 characters with uppercase, lowercase, number and special character',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
    {
      message: 'Password must contain at least: 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*)'
    }
  )
  password: string;

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
    example: 'uuid-unit-id', 
    description: 'Unit ID where user belongs',
    required: false
  })
  @IsOptional()
  unitId?: string;

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

  @ApiProperty({ 
    example: UserStatus.ACTIVE, 
    description: 'User status',
    enum: UserStatus
  })
  @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus value' })
  @IsNotEmpty()
  status: UserStatus;

  @ApiProperty({ 
    example: ['role-uuid-1', 'role-uuid-2'], 
    description: 'Array of role IDs to assign to user',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true, message: 'Each role ID must be a valid UUID' })
  roleIds?: string[];
}
