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
    @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID' })
    permissionIds?: string[];

    @ApiProperty({ 
        example: 'uuid3', 
        description: 'Access scope ID to define the permission scope for this role',
        required: false
    })
    @IsOptional()
    @IsUUID('4', { message: 'Access scope ID must be a valid UUID' })
    accessScopeId?: string;
}
