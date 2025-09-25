import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsArray, ArrayMinSize, ArrayUnique } from "class-validator";

export class CreateInventorySubDto {
  @ApiProperty({
    description: "Tên tiểu ban kiểm kê",
    example: "Tiểu ban Cơ sở Gò Vấp"
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "ID của cơ sở tham gia (InventorySessionUnit)",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsNotEmpty()
  @IsUUID()
  inventorySessionUnitId: string;

  @ApiProperty({
    description: "ID của trưởng tiểu ban",
    example: "550e8400-e29b-41d4-a716-446655440001"
  })
  @IsNotEmpty()
  @IsUUID()
  leaderId: string;

  @ApiProperty({
    description: "ID của thư ký tiểu ban",
    example: "550e8400-e29b-41d4-a716-446655440002"
  })
  @IsNotEmpty()
  @IsUUID()
  secretaryId: string;

  @ApiProperty({
    description: "Danh sách ID các thành viên tiểu ban",
    type: [String],
    example: ["550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440004"]
  })
  @IsArray()
  @IsOptional()
  @IsUUID(4, { each: true })
  memberIds?: string[] = [];
}