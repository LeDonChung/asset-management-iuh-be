import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendAlertEmailDto {
  @ApiProperty({
    description: 'ID của cảnh báo cần gửi email',
    example: 'uuid-alert-id'
  })
  @IsNotEmpty({ message: 'Alert ID là bắt buộc' })
  @IsString({ message: 'Alert ID phải là chuỗi' })
  alertId: string;
}

export class SendAlertEmailResponseDto {
  @ApiProperty({
    description: 'Danh sách email đã gửi thành công',
    example: ['user1@iuh.edu.vn', 'user2@iuh.edu.vn']
  })
  sentEmails: string[];

  @ApiProperty({
    description: 'Danh sách email gửi thất bại',
    example: []
  })
  failedEmails: string[];

  @ApiProperty({
    description: 'Thông tin cảnh báo',
  })
  alertInfo: {
    id: string;
    assetName: string;
    assetCode: string;
    roomName: string;
    detectedAt: Date;
  };
}
