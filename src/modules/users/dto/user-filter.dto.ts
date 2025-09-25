import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { BaseFilterDto } from "src/common/dto/base-filter.dto";
import { UserStatus } from "src/entities/user.entity";

export class UserFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ 
    description: 'Quick filter by unit ID',
    type: String
  })
  @IsOptional()
  @IsString()
  unitFilter?: string;

  @ApiPropertyOptional({ 
    description: 'Quick filter by user status',
    enum: UserStatus
  })
  @IsOptional()
  @IsEnum(UserStatus)
  statusFilter?: UserStatus;
}