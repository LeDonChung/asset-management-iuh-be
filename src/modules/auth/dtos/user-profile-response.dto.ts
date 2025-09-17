import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class UserProfileResponseDto {
    @ApiProperty({ example: "John Doe" })
    @Expose()
    fullName: string;

    @ApiProperty({ example: "john.doe@example.com" })
    @Expose()
    email: string;

    @ApiProperty({ example: "+84901234567", required: false })
    @Expose()
    phoneNumber?: string;

    @ApiProperty({ example: "1990-01-01", required: false })
    @Expose()
    birthDate?: string;
}