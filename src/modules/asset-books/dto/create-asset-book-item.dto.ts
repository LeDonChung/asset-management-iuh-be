import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";

export class CreateAssetBookItemDto {
    @IsOptional()
    @IsString()
    @ApiProperty({ description: 'Book ID' })
    bookId?: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({ description: 'Room ID' })
    roomId: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({ description: 'Asset ID' })
    assetId: string;

    @IsOptional()
    @IsDateString()
    @ApiProperty({ description: 'Assigned At' })
    assignedAt?: Date;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({ description: 'Quantity' })
    quantity: number;

    @IsOptional()
    @IsEnum(AssetBookItemStatus)
    @ApiProperty({ description: 'Status', enum: AssetBookItemStatus })
    status?: AssetBookItemStatus = AssetBookItemStatus.IN_USE;

    @IsOptional()
    @ApiProperty({ description: 'Note' })
    @IsString()
    note?: string;
}