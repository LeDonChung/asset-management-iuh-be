import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AlertStatus } from "src/entities/alert.entity";

export class UpdateAlertDto {
    @ApiProperty({
        example: AlertStatus.CONFIRMED,
        enum: AlertStatus,
        description: 'New status of the alert'
    })
    @IsOptional()
    @IsNotEmpty({ message: 'Status must not be empty' })
    status: AlertStatus;

    @ApiProperty({
        example: 'Issue has been resolved',
        description: 'Optional note about the alert resolution'
    })
    @IsString()
    @IsOptional()
    note?: string;
}