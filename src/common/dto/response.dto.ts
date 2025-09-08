import { ApiProperty } from '@nestjs/swagger';

export class StandardResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Success',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: 'object',
    additionalProperties: true,
  })
  data?: any;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed error information',
    type: [String],
    example: ['email must be a valid email', 'password is required'],
  })
  error?: string[];
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cly3f6g8h-1234-5678-9abc-defghijklmno' },
      email: { type: 'string', example: 'admin@example.com' },
      name: { type: 'string', example: 'John Doe' },
      role: { type: 'string', example: 'ADMIN' },
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
