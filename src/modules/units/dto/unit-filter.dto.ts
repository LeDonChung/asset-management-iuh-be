import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { BaseFilterDto } from "src/common/dto/base-filter.dto";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { UnitType } from "src/common/shared/UnitType";

export class UnitFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: "Quick filter by status",
    enum: UnitStatus,
  })
  @IsOptional()
  statusFilter?: UnitStatus;

  @ApiPropertyOptional({
    description: "Quick filter by unit type",
    enum: UnitType,
  })
  @IsOptional()
  unitTypeFilter?: UnitType;
}
