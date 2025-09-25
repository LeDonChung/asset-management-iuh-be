import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { RoomStatus } from 'src/common/shared/RoomStatus';
import { Unit } from 'src/entities/unit.entity';
import { User } from 'src/entities/user.entity';

export class RoomResponseDto {
  @Expose()
  @ApiProperty({ description: 'Room ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Building name' })
  building: string;

  @Expose()
  @ApiProperty({ description: 'Room code' })
  roomCode: string;

  @Expose()
  @ApiProperty({ description: 'Floor number' })
  floor: string;

  @Expose()
  @ApiProperty({ description: 'Room number' })
  roomNumber: string;

  @Expose()
  @ApiProperty({ description: 'Room status', enum: RoomStatus })
  status: RoomStatus;

  @Expose()
  @ApiPropertyOptional({ description: 'Unit ID' })
  unitId?: string;

  @Expose()
  @Type(() => Unit)
  @ApiPropertyOptional({ description: 'Unit information' })
  unit?: Unit;

  @Expose()
  @Type(() => RoomResponseDto)
  @ApiPropertyOptional({ description: 'Adjacent rooms', type: [RoomResponseDto] })
  adjacentRooms?: RoomResponseDto[];

  @Expose()
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @Expose()
  @Type(() => User)
  @ApiPropertyOptional({ description: 'Created by user' })
  createdBy?: User;
}
