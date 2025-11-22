import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID, IsString, IsOptional, ValidateNested, ArrayNotEmpty } from "class-validator";
import { Type } from "class-transformer";

export class LocationUpdateItemDto {
  @ApiProperty({
    description: "ID của tài sản",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsUUID()
  assetId: string;

  @ApiProperty({
    description: "ID phòng mới (bắt buộc)",
    example: "550e8400-e29b-41d4-a716-446655440001"
  })
  @IsUUID()
  roomId: string;

  @ApiProperty({
    description: "Ghi chú cho việc di chuyển",
    example: "Chuyển từ kho về phòng sử dụng",
    required: false
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class BulkLocationUpdateDto {
  @ApiProperty({
    description: "Danh sách các tài sản cần cập nhật vị trí",
    type: [LocationUpdateItemDto]
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LocationUpdateItemDto)
  items: LocationUpdateItemDto[];

  @ApiProperty({
    description: "Ghi chú chung cho toàn bộ quá trình cập nhật",
    required: false
  })
  @IsString()
  @IsOptional()
  generalNote?: string;
}

export class BulkLocationUpdateResultDto {
  @ApiProperty({
    description: "Số lượng tài sản được cập nhật thành công"
  })
  successCount: number;

  @ApiProperty({
    description: "Số lượng tài sản bị lỗi"
  })
  errorCount: number;

  @ApiProperty({
    description: "Tổng số tài sản được xử lý"
  })
  totalCount: number;

  @ApiProperty({
    description: "Danh sách ID tài sản được cập nhật thành công",
    type: [String]
  })
  successAssetIds: string[];

  @ApiProperty({
    description: "Danh sách lỗi nếu có",
    type: [String]
  })
  errors: string[];

  @ApiProperty({
    description: "Thời gian thực hiện"
  })
  executedAt: Date;

  @ApiProperty({
    description: "ID người thực hiện"
  })
  executedBy: string;
}
