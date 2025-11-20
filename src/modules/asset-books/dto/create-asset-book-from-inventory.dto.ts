import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateAssetBookFromInventoryDto {
  @ApiProperty({
    description: 'ID của assignment trong inventory group (đơn vị phân công)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab'
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  assignmentId: string;

  @ApiProperty({
    description: 'Năm của sổ tài sản',
    example: 2024
  })
  @IsNotEmpty()
  @IsNumber()
  year: number;

  @ApiProperty({
    description: 'Danh sách phòng cần tạo sổ tài sản (nếu không có thì tạo cho tất cả phòng)',
    example: ['room-1', 'room-2'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roomIds?: string[];

  @ApiProperty({
    description: 'Ghi chú cho việc tạo sổ tài sản',
    required: false
  })
  @IsOptional()
  @IsString()
  note?: string;
}
