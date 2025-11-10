import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoveStatus } from 'src/common/shared/MoveStatus';

export class CreateMovementItemDto {
  @ApiProperty({ description: 'ID của tài sản' })
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'ID phòng nguồn' })
  @IsUUID()
  fromRoomId: string;

  @ApiProperty({ description: 'ID phòng đích' })
  @IsUUID()
  toRoomId: string;

  @ApiPropertyOptional({ description: 'Ghi chú cho item di chuyển' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateMovementDto {
  @ApiProperty({ 
    description: 'Danh sách tài sản cần di chuyển',
    type: [CreateMovementItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMovementItemDto)
  items: CreateMovementItemDto[];

  @ApiPropertyOptional({ description: 'Ghi chú yêu cầu di chuyển' })
  @IsOptional()
  @IsString()
  requestNote?: string;

  @ApiPropertyOptional({ 
    description: 'Trạng thái yêu cầu di chuyển. DRAFT = nháp, PENDING_APPROVAL = đề xuất',
    enum: MoveStatus,
    default: MoveStatus.DRAFT
  })
  @IsOptional()
  @IsEnum(MoveStatus)
  status?: MoveStatus = MoveStatus.DRAFT;

  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt (dùng khi có quyền tự phê duyệt)' })
  @IsOptional()
  @IsString()
  approvalNote?: string;
}
