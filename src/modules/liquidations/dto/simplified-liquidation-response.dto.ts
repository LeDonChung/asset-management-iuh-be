import { LiquidationStatus } from "src/common/shared/LiquidationStatus";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { AssetType } from "src/common/shared/AssetType";

export class SimplifiedLiquidationResponseDto {
    @ApiProperty({ description: 'ID của đề xuất thanh lý' })
    @Expose()
    id: string;

    @ApiProperty({ 
        description: 'Trạng thái đề xuất',
        enum: LiquidationStatus 
    })
    @Expose()
    status: LiquidationStatus;

    @ApiProperty({ description: 'Ngày tạo' })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: 'Thông tin đơn vị',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' }
        }
    })
    @Expose()
    unit: {
        id: string;
        name: string;
    };

    @ApiProperty({ description: 'Loại tài sản' })
    @Expose()
    assetType: AssetType;
}
