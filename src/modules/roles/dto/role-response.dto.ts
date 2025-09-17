import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

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
    @Expose()
    id: string;

    @ApiProperty({ example: "Manager" })
    @Expose()
    name: string;

    @ApiProperty({ example: "manager" })
    @Expose()
    code: string;

    @ApiProperty({ type: [PermissionResponseDto] })
    @Expose()
    @Type(() => PermissionResponseDto)
    permissions?: PermissionResponseDto[];
}
