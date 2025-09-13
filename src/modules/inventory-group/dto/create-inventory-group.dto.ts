import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsArray, ArrayMinSize, ArrayUnique, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AssignUnitDto {
  @ApiProperty({
    description: "ID của đơn vị sử dụng (USER_DEPT)",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsNotEmpty()
  @IsUUID()
  unitId: string;

  @ApiProperty({
    description: "Ngày bắt đầu phân công",
    type: "string",
    format: "date",
    example: "2024-01-15"
  })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({
    description: "Ngày kết thúc phân công",
    type: "string", 
    format: "date",
    example: "2024-01-25"
  })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiProperty({
    description: "Ghi chú cho phân công",
    required: false,
    example: "Kiểm kê tài sản phòng IT"
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateInventoryGroupDto {
  @ApiProperty({
    description: "Tên nhóm kiểm kê",
    example: "Nhóm 1 - Kiểm kê Phòng IT"
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "ID của tiểu ban",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsNotEmpty()
  @IsUUID()
  subInventoryId: string;

  @ApiProperty({
    description: "ID của trưởng nhóm",
    example: "550e8400-e29b-41d4-a716-446655440001"
  })
  @IsNotEmpty()
  @IsUUID()
  leaderId: string;

  @ApiProperty({
    description: "ID của thư ký nhóm",
    example: "550e8400-e29b-41d4-a716-446655440002"
  })
  @IsNotEmpty()
  @IsUUID()
  secretaryId: string;

  @ApiProperty({
    description: "Danh sách ID các thành viên nhóm",
    type: [String],
    example: ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"]
  })
  @IsArray()
  @IsOptional()
  @IsUUID(4, { each: true })
  memberIds?: string[] = [];

  @ApiProperty({
    description: "Danh sách phân công đơn vị",
    type: [AssignUnitDto],
    example: [{
      unitId: "550e8400-e29b-41d4-a716-446655440005",
      startDate: "2024-01-15",
      endDate: "2024-01-25",
      note: "Kiểm kê tài sản phòng IT"
    }]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignUnitDto)
  assignments: AssignUnitDto[];
}