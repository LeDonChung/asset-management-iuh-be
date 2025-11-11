import { PartialType } from '@nestjs/swagger';
import { CreateLiquidationProposalDto } from './create-liquidation.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LiquidationStatus } from 'src/common/shared/LiquidationStatus';

export class UpdateLiquidationDto extends PartialType(CreateLiquidationProposalDto) {}

export class UpdateLiquidationStatusDto {
    @ApiProperty({
        description: 'Trạng thái mới của đề xuất thanh lý',
        enum: LiquidationStatus,
        example: LiquidationStatus.APPROVED
    })
    @IsEnum(LiquidationStatus)
    status: LiquidationStatus;

    @ApiProperty({
        description: 'Ghi chú khi thay đổi trạng thái',
        example: 'Đề xuất được phê duyệt với điều kiện bổ sung minh chứng',
        required: false
    })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({
        description: 'URL minh chứng đính kèm',
        example: 'https://example.com/evidence/approval-document.pdf',
        required: false
    })
    @IsOptional()
    @IsString()
    evidenceUrl?: string;
}

export class SendProposalDto {
    @ApiProperty({
        description: 'Ghi chú khi gửi đề xuất',
        example: 'Gửi đề xuất thanh lý để xem xét',
        required: false
    })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({
        description: 'URL minh chứng đính kèm khi gửi đề xuất',
        example: 'https://example.com/evidence/proposal-document.pdf',
        required: false
    })
    @IsOptional()
    @IsString()
    evidenceUrl?: string;
}

export class ApproveProposalDto {
    @ApiProperty({
        description: 'Ghi chú khi phê duyệt đề xuất',
        example: 'Đề xuất được phê duyệt với điều kiện bổ sung minh chứng',
        required: false
    })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({
        description: 'URL minh chứng đính kèm khi phê duyệt',
        example: 'https://example.com/evidence/approval-document.pdf',
        required: true
    })
    @IsString()
    evidenceUrl: string;
}

export class FinalizeProposalDto {
    @ApiProperty({
        description: 'Ghi chú khi hoàn thành đề xuất',
        example: 'Đề xuất đã được hoàn tất thanh lý',
        required: false
    })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({
        description: 'URL minh chứng đính kèm khi hoàn thành',
        example: 'https://example.com/evidence/finalization-document.pdf',
        required: false
    })
    @IsOptional()
    @IsString()
    evidenceUrl?: string;
}

export class UploadEvidenceDto {
    @ApiProperty({
        description: 'URL minh chứng cần upload',
        example: 'https://example.com/evidence/final-report.pdf'
    })
    @IsString()
    evidenceUrl: string;

    @ApiProperty({
        description: 'Ghi chú về minh chứng',
        example: 'Báo cáo hoàn tất thanh lý tài sản',
        required: false
    })
    @IsOptional()
    @IsString()
    note?: string;
}
