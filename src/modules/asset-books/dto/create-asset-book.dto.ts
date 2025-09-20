import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AssetBookStatus } from "src/common/shared/AssetBookStatus";
import { CreateAssetBookItemDto } from "./create-asset-book-item.dto";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAssetBookDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ description: 'Unit ID' })
    unitId: string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({ description: 'Year' })
    year: number;

    @IsOptional()
    @IsEnum(AssetBookStatus)
    @ApiProperty({ description: 'Status', enum: AssetBookStatus })
    status?: AssetBookStatus = AssetBookStatus.OPEN;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @ApiProperty({ description: 'Items', type: [CreateAssetBookItemDto] })
    @Type(() => CreateAssetBookItemDto)
    items?: CreateAssetBookItemDto[];
}
