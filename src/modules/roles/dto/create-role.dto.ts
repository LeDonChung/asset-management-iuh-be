import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsArray, IsOptional, IsUUID } from "class-validator";

export class CreateRoleDto {
    @ApiProperty({ example: 'Manager', description: 'Role name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ 
        example: ['uuid1', 'uuid2'], 
        description: 'Array of permission IDs to assign to this role',
        type: [String],
        required: false
    })
    @IsArray()
    @IsOptional()
    permissionIds?: string[];
}
