import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString } from "class-validator";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

export class AddMemberDto {
  @ApiProperty({
    description: "ID của user được thêm vào ban kiểm kê",
    example: "550e8400-e29b-41d4-a716-446655440000"
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Vai trò trong ban kiểm kê",
    enum: CommitteeRole,
    example: CommitteeRole.MEMBER
  })
  @IsEnum(CommitteeRole)
  role: CommitteeRole;

  @ApiProperty({
    description: "Ghi chú thêm",
    required: false,
    example: "Chuyên gia về tài sản công nghệ thông tin"
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
