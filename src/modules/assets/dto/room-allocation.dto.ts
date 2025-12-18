import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RoomAllocationDto {
  @ApiProperty({ description: 'Room ID' })
  @Expose()
  roomId: string;

  @ApiProperty({ description: 'Tên phòng' })
  @Expose()
  roomName: string;

  @ApiProperty({ description: 'Mã phòng' })
  @Expose()
  roomCode: string;

  @ApiProperty({ description: 'Số lượng phân bổ tại phòng này' })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Trạng thái phân bổ' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Ngày phân bổ' })
  @Expose()
  assignedAt: Date;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @Expose()
  note?: string;
}
