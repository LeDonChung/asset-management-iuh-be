import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { BaseFilterDto } from "src/common/dto/base-filter.dto";
import { AlertStatus, AlertType } from "src/entities/alert.entity";

export class AlertFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: "Lọc theo trạng thái cảnh báo",
    enum: AlertStatus,
  })
  @IsOptional()
  @IsEnum(AlertStatus)
  statusFilter?: AlertStatus;

  @ApiPropertyOptional({
    description: "Ngày tạo từ (YYYY-MM-DD)",
    example: "2024-01-01"
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: "Ngày tạo đến (YYYY-MM-DD)",
    example: "2024-12-31"
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
