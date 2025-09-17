import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { CommitteeRole } from "src/common/shared/CommitteeRole";
import { RoleResponseDto } from "src/modules/roles/dto/role-response.dto";

export class MemberUserDto {
  @ApiProperty({ description: "ID của user" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên user" })
  @Expose()
  fullName: string;

  @ApiProperty({ description: "Email user" })
  @Expose()
  email?: string;

  @ApiProperty({ description: "Số điện thoại" })
  @Expose()
  phoneNumber?: string;

  @ApiProperty({ description: "Vai trò" })
  @Expose()
  @Type(() => RoleResponseDto)
  roles?: RoleResponseDto[];
}

export class InventorySessionMemberResponseDto {
  @ApiProperty({ description: "ID của thành viên ban kiểm kê" })
  @Expose()
  id: string;

  @ApiProperty({ description: "ID của user" })
  @Expose()
  userId: string;

  @ApiProperty({ description: "ID của kỳ kiểm kê" })
  @Expose()
  inventorySessionId: string;

  @ApiProperty({ 
    description: "Chức vụ",
    example: "Phó hiệu trưởng"
  })
  @Expose()
  role: string;

  @ApiProperty({ description: "Ghi chú thêm" })
  @Expose()
  notes?: string;

  @ApiProperty({ description: "Thông tin user" })
  @Expose()
  @Type(() => MemberUserDto)
  user?: MemberUserDto;
}
