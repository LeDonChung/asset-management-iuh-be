import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { Unit } from "src/entities/unit.entity";
import { UserStatus } from "src/entities/user.entity";
import { RoleResponseDto } from "src/modules/roles/dto/role-response.dto";

export class UnitResponseDto {
  @ApiProperty({ example: "uuid" })
  id: string;

  @ApiProperty({ example: "IT Department" })
  name: string;
}

export class UserResponseDto {
  @ApiProperty({ example: "uuid" })
  @Expose()
  id: string;

  @ApiProperty({ example: "john_doe" })
  @Expose()
  username: string;

  @ApiProperty({ example: "John Doe" })
  @Expose()
  fullName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @Expose()
  email: string;

  @ApiProperty({ example: "uuid-unit-id", required: false })
  @Expose()
  unitId?: string;

  @ApiProperty({ example: "+84901234567", required: false })
  @Expose()
  phoneNumber?: string;

  @ApiProperty({ example: "1990-01-01", required: false })
  @Expose()
  birthDate?: string;

  @ApiProperty({ example: UserStatus.ACTIVE, enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiProperty({ type: [RoleResponseDto], required: false })
  @Expose()
  roles?: RoleResponseDto[];

  @ApiProperty({ type: UnitResponseDto, required: false })
  @Expose()
  unit?: UnitResponseDto;
}
