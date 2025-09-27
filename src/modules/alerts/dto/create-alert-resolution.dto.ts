import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AlertResolutionStatus } from "src/entities/alert.entity";

export class CreateAlertResolutionDto {
    @ApiProperty({
        example: 'uuid-asset-id',
        description: 'ID of the asset that triggered the alert',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty({ message: 'Asset ID must not be empty' })
    alertId: string;

    @ApiProperty({ example: AlertResolutionStatus.CONFIRMED, enum: AlertResolutionStatus })
    @IsNotEmpty({ message: 'Resolution must not be empty' })
    resolution: AlertResolutionStatus;

    @ApiProperty({
        example: 'This is a note',
        description: 'Optional note for the alert resolution',
    })
    @IsString()
    @IsOptional()
    note?: string;
}