import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'User username',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
