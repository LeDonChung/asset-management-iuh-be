import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { InventorySubStatus } from "src/common/shared/InventorySubStatus";
import { CommitteeRole } from "src/common/shared/CommitteeRole";

export class SubMemberUserDto {
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

export class SubInventoryMemberDto {
  @ApiProperty({ description: "ID của thành viên" })
  @Expose()
  id: string;

  @ApiProperty({ description: "ID của user" })
  @Expose()
  userId: string;

  @ApiProperty({ 
    description: "Vai trò trong tiểu ban",
    enum: CommitteeRole
  })
  @Expose()
  role: CommitteeRole;

  @ApiProperty({ description: "Ghi chú" })
  @Expose()
  notes?: string;

  @ApiProperty({ description: "Thông tin user" })
  @Expose()
  @Type(() => SubMemberUserDto)
  user?: SubMemberUserDto;
}

export class InventorySessionUnitDto {
  @ApiProperty({ description: "ID của cơ sở" })
  @Expose()
  id: string;

  @ApiProperty({ description: "ID của kỳ kiểm kê" })
  @Expose()
  sessionId: string;

  @ApiProperty({ description: "ID của đơn vị" })
  @Expose()
  unitId: string;
}

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

export class GroupMemberDto {
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

export class UnitAssignmentDto {
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

export class GroupAssignmentDto {
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
  @Type(() => UnitAssignmentDto)
  unit?: UnitAssignmentDto;
}

export class InventoryGroupSummaryDto {
  @ApiProperty({ description: "ID của nhóm" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên nhóm" })
  @Expose()
  name: string;

  @ApiProperty({ description: "Mô tả nhóm" })
  @Expose()
  description?: string;

  @ApiProperty({ 
    description: "Danh sách thành viên nhóm",
    type: [GroupMemberDto]
  })
  @Expose()
  @Type(() => GroupMemberDto)
  members?: GroupMemberDto[];

  @ApiProperty({ 
    description: "Danh sách phân công đơn vị",
    type: [GroupAssignmentDto]
  })
  @Expose()
  @Type(() => GroupAssignmentDto)
  assignments?: GroupAssignmentDto[];

  @ApiProperty({ description: "Ngày tạo" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "Ngày cập nhật" })
  @Expose()
  updatedAt: Date;
}

export class InventorySubResponseDto {
  @ApiProperty({ description: "ID của tiểu ban" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Tên tiểu ban" })
  @Expose()
  name: string;

  @ApiProperty({ description: "ID của cơ sở tham gia" })
  @Expose()
  inventorySessionUnitId: string;

  @ApiProperty({ 
    description: "Trạng thái tiểu ban",
    enum: InventorySubStatus
  })
  @Expose()
  status: InventorySubStatus;

  @ApiProperty({ description: "Thông tin cơ sở tham gia" })
  @Expose()
  @Type(() => InventorySessionUnitDto)
  inventorySessionUnit?: InventorySessionUnitDto;

  @ApiProperty({ 
    description: "Danh sách thành viên tiểu ban",
    type: [SubInventoryMemberDto]
  })
  @Expose()
  @Type(() => SubInventoryMemberDto)
  members?: SubInventoryMemberDto[];

  @ApiProperty({ description: "Mô tả tiểu ban" })
  @Expose()
  description?: string;

  @ApiProperty({ 
    description: "Danh sách nhóm kiểm kê",
    type: [InventoryGroupSummaryDto]
  })
  @Expose()
  @Type(() => InventoryGroupSummaryDto)
  groups?: InventoryGroupSummaryDto[];

  @ApiProperty({ description: "Ngày tạo" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "Ngày cập nhật" })
  @Expose()
  updatedAt: Date;
}
