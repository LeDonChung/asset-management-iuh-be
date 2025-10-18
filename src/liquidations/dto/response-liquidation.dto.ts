import { LiquidationStatus } from "../../common/shared/LiquidationStatus";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { AssetType } from "src/common/shared/AssetType";

export class LiquidationItemResponseDto {
    @ApiProperty({ description: 'ID của item' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'ID của tài sản' })
    @Expose()
    assetId: string;

    @ApiProperty({ description: 'Số lượng theo sổ sách' })
    @Expose()
    systemQuantity: number;

    @ApiProperty({ description: 'Số lượng theo kiểm kê' })
    @Expose()
    countedQuantity: number;

    @ApiProperty({ description: 'Ghi chú', required: false })
    @Expose()
    note?: string;

    @ApiProperty({ description: 'URL hình ảnh minh chứng', required: false })
    @Expose()
    imageUrl?: string;

    @ApiProperty({ description: 'Ngày tạo' })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: 'Thông tin tài sản',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            ktCode: { type: 'string' },
            fixedCode: { type: 'string' }
        }
    })
    @Expose()
    @Type(() => Object)
    asset: {
        id: string;
        name: string;
        ktCode: string;
        fixedCode: string;
    };
}

export class LiquidationHistoryResponseDto {
    @ApiProperty({ description: 'ID của lịch sử' })
    @Expose()
    id: string;

    @ApiProperty({ 
        description: 'Trạng thái sau khi xử lý',
        enum: LiquidationStatus 
    })
    @Expose()
    actionStatus: LiquidationStatus;

    @ApiProperty({ description: 'URL minh chứng', required: false })
    @Expose()
    evidenceUrl?: string;

    @ApiProperty({ description: 'Ghi chú', required: false })
    @Expose()
    note?: string;

    @ApiProperty({ description: 'Ngày xử lý' })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: 'Thông tin người xử lý',
        type: 'object',
        properties: {
            id: { type: 'string' },
            fullName: { type: 'string' }
        }
    })
    @Expose()
    @Type(() => Object)
    handler: {
        id: string;
        fullName: string;
    };
}

export class LiquidationProposalResponseDto {
    @ApiProperty({ description: 'ID của đề xuất thanh lý' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'ID người đề xuất' })
    @Expose()
    proposerId: string;

    @ApiProperty({ description: 'ID đơn vị' })
    @Expose()
    unitId: string;

    @ApiProperty({ 
        description: 'Trạng thái đề xuất',
        enum: LiquidationStatus 
    })
    @Expose()
    status: LiquidationStatus;

    @ApiProperty({ description: 'Ngày tạo' })
    @Expose()
    createdAt: Date;

    @ApiProperty({ description: 'Ngày cập nhật' })
    @Expose()
    updatedAt: Date;


    @ApiProperty({ description: 'Loại tài sản' })
    @Expose()
    assetType: AssetType;

    @ApiProperty({
        description: 'Thông tin người đề xuất',
        type: 'object',
        properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' }
        }
    })
    @Expose()
    @Type(() => Object)
    proposer: {
        id: string;
        fullName: string;
        email: string;
    };

    @ApiProperty({
        description: 'Thông tin đơn vị',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' }
        }
    })
    @Expose()
    @Type(() => Object)
    unit: {
        id: string;
        name: string;
    };

    @ApiProperty({ 
        description: 'Danh sách tài sản trong đề xuất',
        type: [LiquidationItemResponseDto]
    })
    @Expose()
    @Type(() => LiquidationItemResponseDto)
    items: LiquidationItemResponseDto[];

    @ApiProperty({ 
        description: 'Lịch sử xử lý đề xuất',
        type: [LiquidationHistoryResponseDto]
    })
    @Expose()
    @Type(() => LiquidationHistoryResponseDto)
    histories: LiquidationHistoryResponseDto[];
}