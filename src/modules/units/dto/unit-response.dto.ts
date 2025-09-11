import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UnitType } from "src/common/shared/UnitType";
import { UnitStatus } from "src/common/shared/UnitStatus";
import { Expose, Type } from "class-transformer";
import { UserResponseDto } from "src/modules/users/dto/user-response.dto";
import { RoomResponseDto } from "src/modules/rooms/dto/room-response.dto";

export class UnitResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  unitCode: number;

  @ApiPropertyOptional()
  @Expose()
  phone?: string;

  @ApiPropertyOptional()
  @Expose()
  email?: string;

  @ApiProperty({ enum: UnitType })
  @Expose()
  type: UnitType;

  @ApiPropertyOptional()
  @Expose()
  representativeId?: string;

  @ApiProperty({ enum: UnitStatus })
  @Expose()
  status: UnitStatus;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => UserResponseDto)
  representative?: UserResponseDto;

  @ApiProperty({ type: [UserResponseDto] })
  @Expose()
  @Type(() => UserResponseDto)
  users?: UserResponseDto[];

  @ApiProperty({ type: [RoomResponseDto] })
  @Expose()
  @Type(() => RoomResponseDto)
  rooms?: RoomResponseDto[];

  @Expose()
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
}
