import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { InventoryGroupStatus } from "src/common/shared/InventoryGroupStatus";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

export class GroupMemberUserDto {
  @ApiProperty({ description: "ID của user" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên user" })
  @Expose()
  name: string;

  @ApiProperty({ description: "Email user" })
  @Expose()
  email: string;

  @ApiProperty({ description: "Số điện thoại" })
  @Expose()
  phone?: string;
}

export class InventoryGroupMemberDto {
  @ApiProperty({ description: "ID của thành viên" })
  @Expose()
  id: string;

  @ApiProperty({ description: "ID của user" })
  @Expose()
  userId: string;

  @ApiProperty({ 
    description: "Vai trò trong nhóm",
    enum: CommitteeRole
  })
  @Expose()
  role: CommitteeRole;

  @ApiProperty({ description: "Ghi chú" })
  @Expose()
  notes?: string;

  @ApiProperty({ description: "Thông tin user" })
  @Expose()
  @Type(() => GroupMemberUserDto)
  user?: GroupMemberUserDto;
}

export class UnitDto {
  @ApiProperty({ description: "ID của đơn vị" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên đơn vị" })
  @Expose()
  name: string;

  @ApiProperty({ description: "Mã đơn vị" })
  @Expose()
  unitCode: number;
}

export class InventoryGroupAssignmentDto {
  @ApiProperty({ description: "ID của phân công" })
  @Expose()
  id: string;

  @ApiProperty({ description: "ID của nhóm" })
  @Expose()
  groupId: string;

  @ApiProperty({ description: "ID của đơn vị" })
  @Expose()
  unitId: string;

  @ApiProperty({ description: "Ngày bắt đầu" })
  @Expose()
  startDate: Date;

  @ApiProperty({ description: "Ngày kết thúc" })
  @Expose()
  endDate: Date;

  @ApiProperty({ description: "Ghi chú" })
  @Expose()
  note?: string;

  @ApiProperty({ description: "Thông tin đơn vị" })
  @Expose()
  @Type(() => UnitDto)
  unit?: UnitDto;

  @ApiProperty({ description: "Ngày tạo" })
  @Expose()
  createdAt: Date;
}

export class InventorySubDto {
  @ApiProperty({ description: "ID của tiểu ban" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên tiểu ban" })
  @Expose()
  name: string;

  @ApiProperty({ description: "ID của cơ sở tham gia" })
  @Expose()
  inventorySessionUnitId: string;
}

export class InventoryGroupResponseDto {
  @ApiProperty({ description: "ID của nhóm" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên nhóm" })
  @Expose()
  name: string;

  @ApiProperty({ description: "ID của tiểu ban" })
  @Expose()
  subInventoryId: string;

  @ApiProperty({ 
    description: "Trạng thái nhóm",
    enum: InventoryGroupStatus
  })
  @Expose()
  status: InventoryGroupStatus;

  @ApiProperty({ description: "Mô tả nhóm" })
  @Expose()
  description?: string;

  @ApiProperty({ description: "Thông tin tiểu ban" })
  @Expose()
  @Type(() => InventorySubDto)
  subInventory?: InventorySubDto;

  @ApiProperty({ 
    description: "Danh sách thành viên nhóm",
    type: [InventoryGroupMemberDto]
  })
  @Expose()
  @Type(() => InventoryGroupMemberDto)
  members?: InventoryGroupMemberDto[];

  @ApiProperty({ 
    description: "Danh sách phân công đơn vị",
    type: [InventoryGroupAssignmentDto]
  })
  @Expose()
  @Type(() => InventoryGroupAssignmentDto)
  assignments?: InventoryGroupAssignmentDto[];

  @ApiProperty({ description: "Ngày tạo" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "Ngày cập nhật" })
  @Expose()
  updatedAt: Date;
}
