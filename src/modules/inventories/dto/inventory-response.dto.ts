import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { InventorySessionStatus } from "src/common/shared/InventorySessionStatus";
import { UnitResponseDto } from "src/modules/units/dto/unit-response.dto";

export class FileUrlResponseDto {
  @ApiProperty({
    description: "ID của file URL",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "URL của file",
    example: "https://example.com/image1.jpg",
  })
  @Expose()
  url: string;
}

export class InventorySessionUnitResponseDto {
  @ApiProperty({
    description: "ID của inventory session unit",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "ID của kỳ kiểm kê",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  sessionId: string;

  @ApiProperty({
    description: "ID của đơn vị",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  unitId: string;

  @ApiPropertyOptional({
    description: "Thông tin đơn vị",
    type: UnitResponseDto,
  })
  @Expose()
  @Type(() => UnitResponseDto)
  @Expose()
  unit?: UnitResponseDto;
}

export class InventorySessionResponseDto {
  @ApiProperty({
    description: "ID của kỳ kiểm kê",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Năm của kỳ kiểm kê", example: 2024 })
  @Expose()
  year: number;

  @ApiProperty({
    description: "Tên kỳ kiểm kê",
    example: "Kiểm kê cuối năm 2024",
  })
  @Expose()
  name: string;

  @ApiProperty({ description: "Đợt kiểm kê", example: 1 })
  @Expose()
  period: number;

  @ApiProperty({
    description: "Có phải kỳ kiểm kê toàn cục không",
    example: false,
  })
  @Expose()
  isGlobal: boolean;

  @ApiProperty({ description: "Ngày bắt đầu", example: "2024-12-01" })
  @Expose()
  startDate: Date;

  @ApiProperty({ description: "Ngày kết thúc", example: "2024-12-31" })
  @Expose()
  endDate: Date;

  @ApiProperty({
    description: "Trạng thái kỳ kiểm kê",
    enum: InventorySessionStatus,
    example: InventorySessionStatus.PLANNED,
  })
  @Expose()
  status: InventorySessionStatus;

  @ApiProperty({ description: "Ngày tạo", example: "2024-01-01T00:00:00.000Z" })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({
    description: "Danh sách file URLs",
    type: [FileUrlResponseDto],
  })
  @Type(() => FileUrlResponseDto)
  @Expose()
  fileUrls?: FileUrlResponseDto[];

  @ApiPropertyOptional({
    description: "Danh sách đơn vị trong kỳ kiểm kê",
    type: [InventorySessionUnitResponseDto],
  })
  @Expose()
  @Type(() => InventorySessionUnitResponseDto)
  inventorySessionUnits?: InventorySessionUnitResponseDto[];
}
