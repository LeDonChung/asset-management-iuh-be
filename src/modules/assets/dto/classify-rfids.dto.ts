import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class ClassifyRfidsDto {
  @ApiProperty({
    description: 'Danh sách RFID tags cần phân loại',
    example: ['E20000112233445566778899', 'E20000112233445566778898'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  rfids: string[];

  @ApiProperty({
    description: 'ID phòng hiện tại',
    example: 'room-123'
  })
  @IsString()
  @IsNotEmpty()
  currentRoomId: string;

  @ApiProperty({
    description: 'ID đơn vị hiện tại',
    example: 'unit-456'
  })
  @IsString()
  @IsNotEmpty()
  currentUnitId: string;
}
