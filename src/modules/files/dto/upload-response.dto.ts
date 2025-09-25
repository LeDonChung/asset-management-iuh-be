import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'URL của file đã upload',
    example: 'http://localhost:3000/uploads/images/2024/01/15/image-1234567890.png'
  })
  url: string;
}
