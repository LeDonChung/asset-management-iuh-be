import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAlertDto {
    @ApiProperty({
        example: 'uuid-asset-id',
        description: 'ID of the asset that triggered the alert',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty({ message: 'Asset ID must not be empty' })
    assetId: string;

    @ApiProperty({
        example: 'uuid-room-id',
        description: 'ID of the room where the alert was detected',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty({ message: 'Room ID must not be empty' })
    roomId: string;
}