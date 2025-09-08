import { ApiProperty } from "@nestjs/swagger";
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
  id: string;

  @ApiProperty({ example: "john_doe" })
  username: string;

  @ApiProperty({ example: "John Doe" })
  fullName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  email: string;

  @ApiProperty({ example: "uuid-unit-id", required: false })
  unitId?: string;

  @ApiProperty({ example: "+84901234567", required: false })
  phoneNumber?: string;

  @ApiProperty({ example: "1990-01-01", required: false })
  birthDate?: string;

  @ApiProperty({ example: UserStatus.ACTIVE, enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [RoleResponseDto], required: false })
  roles?: RoleResponseDto[];

  @ApiProperty({ type: UnitResponseDto, required: false })
  unit?: UnitResponseDto;
}
