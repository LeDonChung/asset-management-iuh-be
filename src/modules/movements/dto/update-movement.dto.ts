import { PartialType } from '@nestjs/swagger';
import { CreateMovementDto, CreateMovementItemDto } from './create-movement.dto';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoveStatus } from 'src/common/shared/MoveStatus';

export class UpdateMovementDto extends PartialType(CreateMovementDto) {}

export class UpdateMovementStatusDto {
  @ApiProperty({ 
    description: 'Trạng thái mới của di chuyển',
    enum: MoveStatus
  })
  @IsEnum(MoveStatus)
  status: MoveStatus;

  @ApiPropertyOptional({ description: 'Ghi chú khi cập nhật trạng thái' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt' })
  @IsOptional()
  @IsString()
  approvalNote?: string;

  @ApiPropertyOptional({ description: 'Lý do từ chối' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ProposeMovementDto {
  @ApiPropertyOptional({ description: 'Ghi chú khi đề xuất' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveMovementDto {
  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt' })
  @IsOptional()
  @IsString()
  approvalNote?: string;

  @ApiPropertyOptional({ 
    description: 'Đường dẫn minh chứng (ảnh, file đính kèm)',
    example: 'https://example.com/evidence/approve-123.jpg'
  })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export class RejectMovementDto {
  @ApiProperty({ description: 'Lý do từ chối' })
  @IsString()
  rejectionReason: string;
}

export class ExecuteMovementDto {
  @ApiPropertyOptional({ description: 'Ghi chú khi thực hiện di chuyển' })
  @IsOptional()
  @IsString()
  note?: string;
}
