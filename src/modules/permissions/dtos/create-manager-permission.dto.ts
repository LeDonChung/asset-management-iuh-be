import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateManagerPermissionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Admin' })
  name: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({ example: ['CREATE_USER', 'DELETE_USER'], required: false })
  permissions?: string[];
}
