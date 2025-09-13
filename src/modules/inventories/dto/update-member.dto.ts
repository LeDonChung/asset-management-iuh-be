import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

export class UpdateMemberDto {
  @ApiProperty({
    description: "Vai trò trong ban kiểm kê",
    enum: CommitteeRole,
    required: false,
    example: CommitteeRole.SECRETARY
  })
  @IsOptional()
  @IsEnum(CommitteeRole)
  role?: CommitteeRole;

  @ApiProperty({
    description: "Ghi chú thêm",
    required: false,
    example: "Cập nhật vai trò thành thư ký"
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
