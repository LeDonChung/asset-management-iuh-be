import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BaseFilterDto } from "src/common/dto/base-filter.dto";

export class RoomFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ description: "Search by room name, room code, or room number" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by building name" })
  @IsOptional()
  @IsString()
  buildingFilter?: string;

  @ApiPropertyOptional({ description: "Filter by floor" })
  @IsOptional()
  @IsString()
  floorFilter?: string;
}
