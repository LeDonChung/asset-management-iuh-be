import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponseDto {
  @ApiProperty({ example: "uuid" })
  id: string;
  @ApiProperty({ example: "CREATE_USER" })
  name: string;
  @ApiProperty({ example: "create_user" })
  code: string;
}

export class ManagerPermissionResponseDto {
  @ApiProperty({ example: "uuid" })
  id: string;
  @ApiProperty({ example: "Admin" })
  name: string;
  @ApiProperty({ example: "admin" })
  code?: string;
  @ApiProperty({ type: [PermissionResponseDto] })
  permissions?: PermissionResponseDto[];
}
