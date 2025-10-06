import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { AlertStatus, AlertType } from "src/entities/alert.entity";

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
    @ApiProperty({ description: 'Mã RFID của tài sản', example: 'RFID-123456' })
    rfid: string;
}

export class UserResponseDto {
    @ApiProperty({ example: "uuid" })
    id: string;
    @ApiProperty({ example: "John Doe" })
    fullName: string;
    @ApiProperty({ example: "john.doe@example.com" })
    email: string;
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

    @ApiProperty({ example: "RFID-123456", description: "RFID tag of the asset" })
    @Expose()
    deviceId: string;

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

    @ApiProperty({ example: "Issue has been resolved" })
    @Expose()
    note: string;

    @ApiProperty({ example: "http://example.com/image.jpg" })
    @Expose()
    image?: string;

    @ApiProperty({
        example: {
            id: 'uuid-user-id',
            fullName: 'Jane Smith',
            email: 'jane.smith@example.com'
        }
    })
    @Expose()
    resolver?: UserResponseDto;

    @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
    @Expose()
    resolvedAt?: Date;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z'
    })
    @Expose()
    createdAt: Date;
}