import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    description: 'Câu trả lời từ AI',
    example: 'Đơn vị CNTT hiện có 150 tài sản, bao gồm 80 máy tính, 40 thiết bị văn phòng và 30 máy in.',
  })
  message: string;

  @ApiProperty({
    description: 'Dữ liệu liên quan (nếu có)',
    required: false,
  })
  data?: any;

  @ApiProperty({
    description: 'Timestamp',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Số lần retry đã sử dụng',
  })
  retryCount?: number;

  @ApiProperty({
    description: 'API key index được sử dụng',
  })
  keyUsed?: number;
}

