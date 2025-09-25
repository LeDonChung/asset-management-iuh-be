import { ApiProperty } from '@nestjs/swagger';
import { AssetResponseDto } from './asset-response.dto';

export class ClassifyRfidsResponseDto {
  @ApiProperty({
    description: 'Danh sách tài sản khớp với phòng hiện tại',
    type: [AssetResponseDto]
  })
  matched: AssetResponseDto[];

  @ApiProperty({
    description: 'Danh sách tài sản thuộc phòng hàng xóm (adjacent rooms)',
    type: [AssetResponseDto]
  })
  neighbors: AssetResponseDto[];

  @ApiProperty({
    description: 'Danh sách tài sản thuộc phòng khác',
    type: [AssetResponseDto]
  })
  otherRooms: AssetResponseDto[];

  @ApiProperty({
    description: 'Danh sách RFID không tìm thấy trong hệ thống',
    example: ['E20000112233445566778899', 'E20000112233445566778898'],
    type: [String]
  })
  unknowns: string[];
}
