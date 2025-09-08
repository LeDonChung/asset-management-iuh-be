import { PartialType } from "@nestjs/mapped-types";
import { CreateManagerPermissionDto } from "./create-manager-permission.dto";
import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: "CREATE_USER", required: false })
  id?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: "CREATE_USER" })
  name: string;
}
export class UpdateManagerPermissionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: "Admin" })
  name: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: [{ id: "uuid", name: "CREATE_USER" }],
    required: false,
    type: [UpdatePermissionDto],
  })
  permissions?: UpdatePermissionDto[];
}
