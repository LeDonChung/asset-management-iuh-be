import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRfidDto {
  @ApiProperty({ description: 'RFID ID (E280F3362000F00005E66021)' })
  @IsString()
  @IsNotEmpty()
  rfidId: string;
}
