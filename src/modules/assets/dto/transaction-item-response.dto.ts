import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type, Transform } from "class-transformer";

export class TransactionItemAssetResponseDto {
  @ApiProperty({
    description: "ID của transaction item",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Đơn vị bàn giao",
  })
  @Expose()
  @Type(() => Object)
  @Transform(({ obj }) => obj.transaction?.fromUnit ? {
    id: obj.transaction.fromUnit.id,
    name: obj.transaction.fromUnit.name,
    unitCode: obj.transaction.fromUnit.unitCode
  } : null)
  fromUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiProperty({
    description: "Đơn vị tiếp nhận",
  })
  @Expose()
  @Type(() => Object)
  @Transform(({ obj }) => obj.transaction?.toUnit ? {
    id: obj.transaction.toUnit.id,
    name: obj.transaction.toUnit.name,
    unitCode: obj.transaction.toUnit.unitCode
  } : null)
  toUnit?: {
    id: string;
    name: string;
    unitCode: number;
  };

  @ApiProperty({
    description: "Phòng hiện tại của tài sản",
  })
  @Expose()
  @Type(() => Object)
  @Transform(({ obj }) => obj.fromRoom ? {
    id: obj.fromRoom.id,
    name: obj.fromRoom.name,
    roomCode: obj.fromRoom.roomCode,
  } : null)
  fromRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiProperty({
    description: "Phòng đích cho tài sản",
  })
  @Expose()
  @Type(() => Object)
  @Transform(({ obj }) => obj.toRoom ? {
    id: obj.toRoom.id,
    name: obj.toRoom.name,
    roomCode: obj.toRoom.roomCode,
  } : null)
  toRoom?: {
    id: string;
    name: string;
    roomCode: string;
  };

  @ApiProperty({
    description: "Ghi chú cho tài sản",
  })
  @Expose()
  note?: string;

  @ApiProperty({
    description: "Ngày tạo",
  })
  @Expose()
  createdAt: Date;
}
