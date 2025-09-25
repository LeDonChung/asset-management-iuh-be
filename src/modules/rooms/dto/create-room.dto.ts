import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from 'src/common/shared/RoomStatus';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Building name' })
  @IsString()
  building: string;

  @ApiProperty({ description: 'Floor number' })
  @IsString()
  floor: string;

  @ApiProperty({ description: 'Room number' })
  @IsString()
  roomNumber: string;

  @ApiPropertyOptional({ description: 'IDs of adjacent rooms', type: [String] })
  @IsOptional()
  @IsUUID("all", { each: true }) 
  adjacentRoomIds: string[];

  @ApiPropertyOptional({ 
    description: 'Room status', 
    enum: RoomStatus,
    default: RoomStatus.ACTIVE 
  })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Unit ID this room belongs to' })
  @IsOptional()
  @IsUUID()
  unitId?: string;
}
