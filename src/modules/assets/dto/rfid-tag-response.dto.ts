import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class RfidTagResponseDto {
  @ApiProperty({ description: "RFID ID" })
  @Expose()
  rfidId: string;

  @ApiProperty({ description: "Mã tài sản cố định" })
  @Expose()
  assetId: string;

  @ApiProperty({ description: "Ngày định danh và đưa vào tài sản" })
  @Expose()
  assignedDate: string;
}
