import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString } from "class-validator";

export class AddMemberDto {
  @ApiProperty({
    description: "ID của user được thêm vào ban kiểm kê",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Chức vụ",
    required: false,
    example: "Phó hiệu trưởng"
  })
  @IsOptional()
  @IsString()
  role?: string;
}
