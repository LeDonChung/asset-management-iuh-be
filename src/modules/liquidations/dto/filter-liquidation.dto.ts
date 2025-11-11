import { IsEnum, IsOptional, IsUUID, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { BaseFilterDto } from "src/common/dto/base-filter.dto";
import { ApiProperty } from "@nestjs/swagger";
import { LiquidationStatus } from "src/common/shared/LiquidationStatus";

export class LiquidationProposalFilterDto extends BaseFilterDto {
  @ApiProperty({
    description: "Lọc theo trạng thái đề xuất thanh lý",
    enum: LiquidationStatus,
    required: false,
    example: LiquidationStatus.PROPOSED,
  })
  @IsOptional()
  @IsEnum(LiquidationStatus)
  status?: LiquidationStatus;

  @ApiProperty({
    description: "Lọc theo ID đơn vị",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({
    description: "Lọc theo năm tạo đề xuất",
    example: 2023,
  })
  @IsOptional()
  @IsNumber()
  @Min(2000)
  year?: number;
}
