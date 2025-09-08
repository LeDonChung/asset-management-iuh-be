import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;

    @ApiProperty({ example: "CREATE_USER" })
    name: string;

    @ApiProperty({ example: "create_user" })
    code: string;
}

export class RoleResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;

    @ApiProperty({ example: "Manager" })
    name: string;

    @ApiProperty({ example: "manager" })
    code: string;

    @ApiProperty({ type: [PermissionResponseDto] })
    permissions?: PermissionResponseDto[];
}
