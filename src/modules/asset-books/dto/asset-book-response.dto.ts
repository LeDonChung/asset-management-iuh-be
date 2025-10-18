import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import { AssetType } from "src/common/shared/AssetType";
import { AssetBookItemStatus } from "src/common/shared/AssetBookItemStatus";
import { UnitResponseDto } from "src/modules/users/dto/user-response.dto";
import { AssetResponseDto } from "src/modules/assets/dto/asset-response.dto";
import { RoomResponseDto } from "src/modules/rooms/dto/room-response.dto";
import { ApiProperty } from "@nestjs/swagger";


export class AssetBookItemResponseDto {
    @ApiProperty({ description: 'ID' })
    id: string; 
    @ApiProperty({ description: 'Room ID' })
    roomId: string;
    @ApiProperty({ description: 'Asset ID' })
    assetId: string;
    @ApiProperty({ description: 'Assigned At' })
    assignedAt: Date;
    @ApiProperty({ description: 'Quantity' })
    quantity: number;
    @ApiProperty({ description: 'Status', enum: AssetBookItemStatus })
    status: AssetBookItemStatus;
    @ApiProperty({ description: 'Note' })
    note: string;
    @ApiProperty({ description: 'Asset' })
    asset: AssetResponseDto;
    @ApiProperty({ description: 'Room' })
    room: RoomResponseDto;
}

export class AssetTypeResponse {
    @ApiProperty({ description: 'Type', enum: AssetType })
    type: AssetType;
    @ApiProperty({ description: 'Items', type: [AssetBookItemResponseDto] })
    items: AssetBookItemResponseDto[];
}

export class AssetBookResponseDto {
    id: string;
    @ApiProperty({ description: 'Unit ID' })
    unitId: string;
    @ApiProperty({ description: 'Year' })
    year: number;
    @ApiProperty({ description: 'Looked At' })
    lookedAt?: Date;
    @ApiProperty({ description: 'Unit' })
    unit: UnitResponseDto;
    @ApiProperty({ description: 'Status', enum: AssetBookStatus })
    status: AssetBookStatus;
    @ApiProperty({ description: 'Asset Types', type: [AssetTypeResponse] })
    assetTypes: AssetTypeResponse[];
}

export class AssetItemResponseDto  extends AssetResponseDto{
    @ApiProperty({ description: 'Note' })
    note: string;
}