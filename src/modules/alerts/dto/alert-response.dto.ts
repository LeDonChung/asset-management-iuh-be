import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { AlertResolutionStatus, AlertStatus, AlertType } from "src/entities/alert.entity";

export class RoomResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;
    @ApiProperty({ example: "Conference Room" })
    name: string;
}

export class AssetResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;
    @ApiProperty({ example: "Laptop Dell XPS 13" })
    name: string;
    @ApiProperty({ description: 'Mã tài sản cố định' })
    fixedCode: string;
}

export class AlertResolutionResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;
    @ApiProperty({ example: "Issue has been resolved" })
    note: string;
    @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
    resolvedAt: Date;
    @ApiProperty({ example: AlertResolutionStatus.CONFIRMED, enum: AlertResolutionStatus })
    resolution: AlertResolutionStatus;
}

export class AlertResponseDto {
    @ApiProperty({
        example: 'uuid-alert-id'
    })
    @Expose()
    id: string;

    @ApiProperty({
        example: AlertStatus.PENDING,
        enum: AlertStatus
    })
    @Expose()
    status: AlertStatus;

    @ApiProperty({
        example: AlertType.UNAUTHORIZED_MOVEMENT,
        enum: AlertType
    })
    @Expose()
    type: AlertType;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z'
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        example: {
            id: 'uuid-room-id',
            name: 'Conference Room',
            location: 'First Floor'
        }
    })
    @Expose()
    room: RoomResponseDto;

    @ApiProperty({
        example: {
            id: 'uuid-asset-id',
            name: 'Laptop Dell XPS 13',
            fixedCode: 'ASSET-2024-0001'
        }
    })
    @Expose()
    asset: AssetResponseDto;

    @ApiProperty({
        example: [
            {
                id: 'uuid-resolution-id',
                note: 'Issue has been resolved',
                resolvedAt: '2024-01-02T00:00:00.000Z'
            }
        ]
    })
    @Expose()
    resolution: AlertResolutionResponseDto;
}