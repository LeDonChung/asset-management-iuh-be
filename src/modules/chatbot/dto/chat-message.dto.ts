import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    description: 'Câu hỏi của người dùng',
    example: 'Đơn vị CNTT có bao nhiêu tài sản?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'ID đơn vị (optional - nếu muốn filter theo đơn vị)',
    required: false,
  })
  @IsString()
  @IsOptional()
  unitId?: string;

  @ApiProperty({
    description: 'Lịch sử chat (optional)',
    required: false,
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{ role: string; content: string }>;
}

