import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { UnitType } from 'src/common/shared/UnitType';
import { UnitStatus } from 'src/common/shared/UnitStatus';

export class CreateUnitDto {
  @ApiProperty({ description: 'Unit name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsPhoneNumber('VN')
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: UnitType, description: 'Unit type' })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiPropertyOptional({ description: 'Representative user ID' })
  @IsOptional()
  @IsUUID()
  representativeId?: string;

  @ApiPropertyOptional({ description: 'Parent unit ID (null for root campus)' })
  @IsOptional()
  @IsUUID()
  parentUnitId?: string;

  @ApiPropertyOptional({ enum: UnitStatus, description: 'Unit status', default: UnitStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;
}
