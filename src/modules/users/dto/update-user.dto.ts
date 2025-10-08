import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { UserStatus } from "src/entities/user.entity";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateUserDto extends PartialType(CreateUserDto) {

}

export class UpdateUserStatusDto {
    @ApiProperty({
        example: UserStatus.ACTIVE,
        description: 'User status',
        enum: UserStatus
    })
    @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus value' })
    @IsNotEmpty()
    status: UserStatus;
}