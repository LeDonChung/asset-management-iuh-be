// Database Schema for Asset Management System - IUH
// Generated from TypeORM entities

// =============================================================================
// ENUMS
// =============================================================================

// User related enums
enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
  DELETED
}

// Unit related enums
enum UnitType {
  CAMPUS         // Cơ sở (root level)
  ADMIN_DEPT     // Phòng quản trị
  USER_DEPT      // Đơn vị sử dụng
}

enum UnitStatus {
  ACTIVE
  INACTIVE
}

// Asset related enums
enum AssetType {
  FIXED_ASSET      // Tài sản cố định
  TOOLS_EQUIPMENT  // Công cụ dụng cụ
}

enum AssetStatus {
  IN_USE                  // đang sử dụng
  WAITING_HANDOVER       // chờ bàn giao
  WAITING_RECEIVE        // chờ tiếp nhận
  DAMAGED                // hư hỏng
  LOST                   // đã mất
  PROPOSED_LIQUIDATION   // đề xuất thanh lý
  LIQUIDATED             // đã thanh lý
  WAITING_ALLOCATION     // chờ phân bổ
}

// Asset Book related enums
enum AssetBookStatus {
  OPEN
  LOCKED
}

enum AssetBookItemStatus {
  PENDING
  APPROVED
  REJECTED
}

// Room related enums
enum RoomStatus {
  ACTIVE
  INACTIVE
}

// Inventory related enums
enum InventorySessionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CLOSED
}

enum InventoryGroupStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
}

enum InventorySubStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

enum InventoryResultStatus {
  MATCH
  MISMATCH
  MISSING
  EXTRA
}

enum ScanMethod {
  RFID
  QR_CODE
  MANUAL
}

// Committee related enums
enum CommitteeRole {
  LEADER
  SECRETARY
  MEMBER
}

// Liquidation related enums
enum LiquidationStatus {
  DRAFT        // Bản nháp, chưa gửi đề xuất
  PROPOSED     // Đề xuất thanh lý
  APPROVED     // Phòng quản trị chấp nhận và gửi minh chứng
  REJECTED     // Phòng quản trị từ chối
  FINALIZED    // Bên trường duyệt xong, cập nhật minh chứng hoàn tất
}

// Alert related enums
enum AlertStatus {
  PENDING
  CONFIRMED
  FALSE_ALARM
  SYSTEM_ERROR
}

enum AlertType {
  UNAUTHORIZED_MOVEMENT
}

enum DamageReportStatus {
  REPORTED
  IN_REVIEW
  APPROVED
  REJECTED
}

// Transaction related enums
enum TransactionType {
  ALLOCATION      // Phân bổ (từ kho về đơn vị)
  HANDOVER        // Bàn giao giữa đơn vị
  RETURN          // Trả về kho
}

enum TransactionStatus {
  DRAFT           // Bản nháp
  PENDING         // Chờ phê duyệt
  APPROVED        // Đã phê duyệt
  REJECTED        // Từ chối
  COMPLETED       // Hoàn thành
  CANCELLED       // Đã hủy
}

// Movement related enums
enum MoveStatus {
  PENDING_APPROVAL   // Chờ phê duyệt
  APPROVED           // Đã phê duyệt
  REJECTED           // Từ chối
  IN_PROGRESS        // Đang thực hiện
  COMPLETED          // Hoàn thành
  CANCELLED          // Đã hủy
}

// Access Scope enums
enum AccessScopeType {
  GLOBAL         // Toàn hệ thống
  UNIT          // Chỉ unit được chỉ định
  CHILD_UNITS   // Unit và các unit con
  SELF          // Chỉ dữ liệu của chính mình
}

// =============================================================================
// TABLES
// =============================================================================

// User Management Tables
Table users {
  id string [primary key, note: 'UUID']
  username string [not null, unique, note: 'Tài khoản đăng nhập']
  password string [not null, note: 'Mật khẩu đã mã hóa']
  fullName string [not null, note: 'Họ tên đầy đủ']
  email string [not null, unique, note: 'Email']
  unitId string [note: 'Đơn vị làm việc']
  phoneNumber string [note: 'Số điện thoại']
  birthDate date [note: 'Ngày sinh']
  status UserStatus [default: 'ACTIVE', note: 'Trạng thái tài khoản']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
  
  indexes {
    username
    email
  }
}

Table roles {
  id string [primary key, note: 'UUID']
  name string [not null, unique, note: 'Tên vai trò']
  code string [not null, unique, note: 'Mã vai trò']
  accessScopeId string [note: 'Phạm vi truy cập']
  isProtected boolean [default: false, note: 'Vai trò được bảo vệ không thể xóa']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table permissions {
  id string [primary key, note: 'UUID']
  name string [not null, note: 'Tên quyền']
  code string [not null, unique, note: 'Mã quyền']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table access_scopes {
  id string [primary key, note: 'UUID']
  type AccessScopeType [not null, note: 'Loại phạm vi truy cập']
  unitId string [note: 'Unit ID khi type là UNIT hoặc CHILD_UNITS']
  description string [note: 'Mô tả']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table user_roles {
  userId string [not null]
  roleId string [not null]
  
  indexes {
    (userId, roleId) [pk]
  }
}

Table role_permissions {
  roleId string [not null]
  permissionId string [not null]
  
  indexes {
    (roleId, permissionId) [pk]
  }
}

Table units {
  id string [primary key, note: 'UUID']
  name string [not null, note: 'Tên đơn vị']
  unitCode integer [not null, unique, note: 'Mã đơn vị tự động tạo']
  phone string [note: 'Số điện thoại']
  email string [note: 'Email']
  type UnitType [not null, note: 'Loại đơn vị']
  representativeId string [note: 'Người đại diện']
  parentUnitId string [note: 'Đơn vị cha (null nếu là cơ sở root)']
  status UnitStatus [default: 'ACTIVE', note: 'Trạng thái']
  createdBy string [note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table rooms {
  id string [primary key, note: 'UUID']
  name string [not null, note: 'Tên phòng']
  building string [not null, note: 'Tòa nhà']
  roomCode string [not null, unique, note: 'Mã phòng: xyzz.nn']
  floor string [not null, note: 'Tầng']
  roomNumber string [not null, note: 'Số phòng']
  status RoomStatus [default: 'ACTIVE', note: 'Trạng thái phòng']
  unitId string [note: 'Đơn vị quản lý']
  createdBy string [note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
  
  indexes {
    (building, floor, roomNumber, unitId) [unique, name: 'unique_room_location']
  }
}

Table room_adjacent_rooms {
  roomId string [not null]
  adjacentRoomId string [not null]
  
  indexes {
    (roomId, adjacentRoomId) [pk]
  }
}

Table categories {
  id string [primary key, note: 'UUID']
  name string [not null, note: 'Tên danh mục']
  code string [not null, unique, note: 'Mã danh mục']
  parentId string [note: 'Danh mục cha']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table assets {
  id string [primary key, note: 'UUID']
  ktCode string [not null, note: 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00)']
  fixedCode string [not null, note: 'Mã tài sản cố định xxxx.yyyy']
  name string [not null, note: 'Tên tài sản']
  specs string [note: 'Thông số kỹ thuật']
  entrydate date [not null, note: 'Ngày nhập']
  currentRoomId string [note: 'Vị trí hiện tại']
  unit string [not null, note: 'Đơn vị tính']
  quantity integer [default: 1, note: 'Số lượng (với tài sản cố định = 1)']
  origin string [note: 'Xuất xứ']
  purchasePackage integer [default: 0, note: 'Gói mua']
  type AssetType [not null, note: 'Loại tài sản']
  categoryId string [not null, note: 'Danh mục tài sản']
  status AssetStatus [default: 'IN_USE', note: 'Trạng thái tài sản']
  allowMove boolean [default: true, note: 'Cho phép di chuyển']
  locationInRoom string [note: 'Vị trí cụ thể trong phòng']
  createdBy string [not null, note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table rfid_tags {
  id integer [primary key, increment]
  rfidId string [note: 'ID thẻ RFID: E280F3362000F00005E66021']
  assetId string [not null, unique, note: 'Mã tài sản cố định']
  assignedDate string [not null, note: 'Ngày định danh và đưa vào tài sản']
}

Table alerts {
  id string [primary key, note: 'UUID']
  assetId string [not null, note: 'Tài sản']
  roomId string [not null, note: 'Phòng']
  type AlertType [default: 'UNAUTHORIZED_MOVEMENT', note: 'Loại cảnh báo']
  status AlertStatus [default: 'PENDING', note: 'Trạng thái cảnh báo']
  resolverId string [note: 'Người xử lý']
  note text [note: 'Ghi chú']
  image text [note: 'Hình ảnh']
  deviceId text [not null, note: 'ID thiết bị']
  createdAt timestamp [not null, note: 'Thời gian tạo']
  resolvedAt timestamp [note: 'Thời gian xử lý']
}

Table asset_transactions {
  id string [primary key, note: 'UUID']
  type TransactionType [not null, note: 'Loại giao dịch']
  fromUnitId string [note: 'Đơn vị bàn giao (null nếu allocation)']
  toUnitId string [not null, note: 'Đơn vị tiếp nhận']
  requesterId string [not null, note: 'Người yêu cầu']
  approverId string [note: 'Người phê duyệt (phòng quản trị)']
  handoverId string [note: 'Người bàn giao']
  receiverId string [note: 'Người tiếp nhận']
  status TransactionStatus [default: 'DRAFT', note: 'Trạng thái']
  requestNote text [note: 'Ghi chú yêu cầu']
  approvalNote text [note: 'Ghi chú phê duyệt']
  rejectionReason text [note: 'Lý do từ chối']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table asset_transaction_items {
  id string [primary key, note: 'UUID']
  transactionId string [not null]
  assetId string [not null]
  fromRoomId string [note: 'Phòng hiện tại của tài sản này']
  toRoomId string [note: 'Phòng đích cho tài sản này']
  note text [note: 'Ghi chú cho từng tài sản']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table asset_transaction_histories {
  id string [primary key, note: 'UUID']
  transactionId string [not null]
  oldStatus TransactionStatus [not null, note: 'Trạng thái giao dịch cũ']
  newStatus TransactionStatus [not null, note: 'Trạng thái giao dịch mới']
  evidenceUrl string [note: 'Đường dẫn minh chứng']
  changedBy string [not null, note: 'Người thay đổi']
  note text [note: 'Ghi chú thay đổi']
  createdAt timestamp [not null]
}

Table asset_movements {
  id string [primary key, note: 'UUID']
  requesterId string [not null, note: 'Người yêu cầu']
  approverId string [note: 'Người phê duyệt']
  status MoveStatus [default: 'PENDING_APPROVAL', note: 'Trạng thái']
  requestNote text [note: 'Ghi chú của người yêu cầu']
  approvalNote text [note: 'Ghi chú phê duyệt']
  rejectionReason text [note: 'Lý do từ chối']
  approvedAt timestamp [note: 'Thời gian phê duyệt']
  completedAt timestamp [note: 'Thời gian hoàn thành di chuyển']
  cancelledAt timestamp [note: 'Thời gian hủy bỏ']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table asset_movement_items {
  id string [primary key, note: 'UUID']
  movementId string [not null]
  assetId string [not null]
  fromRoomId string [not null, note: 'Phòng nguồn']
  toRoomId string [not null, note: 'Phòng đích']
  note text [note: 'Ghi chú']
  movedAt timestamp [note: 'Thời gian thực hiện di chuyển']
  movedBy string [note: 'Người thực hiện di chuyển']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table asset_movement_histories {
  id string [primary key, note: 'UUID']
  movementId string [not null]
  oldStatus MoveStatus [not null, note: 'Trạng thái cũ']
  newStatus MoveStatus [not null, note: 'Trạng thái mới']
  changedBy string [not null, note: 'Người thay đổi']
  note text [note: 'Ghi chú']
  createdAt timestamp [not null]
}

Table asset_books {
  id string [primary key, note: 'UUID']
  unitId string [not null, note: 'Đơn vị']
  year integer [not null, note: 'Năm']
  lookedAt timestamp [note: 'Thời gian xem xét']
  status AssetBookStatus [default: 'OPEN', note: 'Trạng thái sổ tài sản']
}

Table asset_book_items {
  id string [primary key, note: 'UUID']
  bookId string [not null, note: 'Sổ tài sản']
  assetId string [not null, note: 'Tài sản']
  roomId string [not null, note: 'Phòng']
  recordedAt timestamp [not null, note: 'Thời gian ghi nhận']
  note text [note: 'Ghi chú']
}

Table inventory_sessions {
  id string [primary key, note: 'UUID']
  year integer [not null, note: 'Năm kiểm kê']
  name string [not null, note: 'Tên kỳ kiểm kê']
  startDate date [not null, note: 'Ngày bắt đầu']
  endDate date [not null, note: 'Ngày kết thúc']
  status InventorySessionStatus [default: 'PLANNED', note: 'Trạng thái kỳ kiểm kê']
  createdBy string [not null, note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table inventory_session_units {
  id string [primary key, note: 'UUID']
  inventorySessionId string [not null]
  unitId string [not null]
  status string [default: 'PLANNED']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table inventory_session_members {
  id string [primary key, note: 'UUID']
  inventorySessionId string [not null]
  userId string [not null]
  role CommitteeRole [not null, note: 'Vai trò trong ủy ban']
  createdAt timestamp [not null]
}

Table inventory_subs {
  id string [primary key, note: 'UUID']
  inventorySessionUnitId string [not null, note: 'Kỳ kiểm kê đơn vị']
  name string [not null, note: 'Tên tiểu ban kiểm kê']
  status InventorySubStatus [default: 'PENDING', note: 'Trạng thái tiểu ban']
  createdBy string [note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table sub_inventory_members {
  id string [primary key, note: 'UUID']
  subInventoryId string [not null]
  userId string [not null]
  role CommitteeRole [not null, note: 'Vai trò trong tiểu ban']
  createdAt timestamp [not null]
}

Table inventory_groups {
  id string [primary key, note: 'UUID']
  name string [not null, note: 'Tên nhóm kiểm kê']
  subInventoryId string [not null, note: 'Tiểu ban']
  status InventoryGroupStatus [default: 'PLANNED', note: 'Trạng thái nhóm']
  description string [note: 'Mô tả nhóm']
  createdBy string [note: 'Người tạo']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table inventory_group_members {
  id string [primary key, note: 'UUID']
  groupId string [not null]
  userId string [not null]
  role CommitteeRole [not null, note: 'Vai trò trong nhóm']
  createdAt timestamp [not null]
}

Table inventory_group_assignments {
  id string [primary key, note: 'UUID']
  groupId string [not null]
  unitId string [not null]
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table inventory_results {
  id string [primary key, note: 'UUID']
  inventorySessionId string [not null]
  assetId string [not null]
  roomId string [not null]
  status InventoryResultStatus [not null, note: 'Kết quả kiểm kê']
  note text [note: 'Ghi chú']
  scannedAt timestamp [note: 'Thời gian quét']
  scannedBy string [note: 'Người quét']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table liquidation_proposals {
  id string [primary key, note: 'UUID']
  proposerId string [not null, note: 'Người đề xuất']
  assetType AssetType [default: 'FIXED_ASSET', note: 'Loại tài sản']
  unitId string [not null, note: 'Đơn vị sử dụng']
  status LiquidationStatus [default: 'PROPOSED', note: 'Trạng thái đề xuất']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
  deletedAt timestamp [note: 'Soft delete']
}

Table liquidation_proposal_items {
  id string [primary key, note: 'UUID']
  proposalId string [not null]
  assetId string [not null]
  reason text [not null, note: 'Lý do thanh lý']
  estimatedValue decimal [note: 'Giá trị ước tính']
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table liquidation_histories {
  id string [primary key, note: 'UUID']
  proposalId string [not null]
  oldStatus LiquidationStatus [not null, note: 'Trạng thái cũ']
  newStatus LiquidationStatus [not null, note: 'Trạng thái mới']
  changedBy string [not null, note: 'Người thay đổi']
  note text [note: 'Ghi chú']
  createdAt timestamp [not null]
}

Table file_urls {
  id string [primary key, note: 'UUID']
  url string [not null, note: 'URL của file']
  fileName string [not null, note: 'Tên file']
  fileSize integer [note: 'Kích thước file']
  mimeType string [note: 'Loại MIME']
  createdAt timestamp [not null]
}

Table file_url_inventory_sessions {
  inventorySessionId string [not null]
  fileUrlId string [not null]
  
  indexes {
    (inventorySessionId, fileUrlId) [pk]
  }
}

Table manager_permissions {
  id string [primary key, note: 'UUID']
  userId string [not null]
  unitId string [not null]
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

// =============================================================================
// RELATIONSHIPS
// =============================================================================

// User & Role relationships
Ref: users.unitId > units.id
Ref: user_roles.userId > users.id [delete: cascade]
Ref: user_roles.roleId > roles.id [delete: cascade]

// Role & Permission relationships
Ref: roles.accessScopeId > access_scopes.id
Ref: role_permissions.roleId > roles.id [delete: cascade]
Ref: role_permissions.permissionId > permissions.id [delete: cascade]

// Access Scope relationships
Ref: access_scopes.unitId > units.id

// Unit relationships
Ref: units.representativeId > users.id
Ref: units.parentUnitId > units.id
Ref: units.createdBy > users.id

// Room relationships
Ref: rooms.unitId > units.id
Ref: rooms.createdBy > users.id
Ref: room_adjacent_rooms.roomId > rooms.id [delete: cascade]
Ref: room_adjacent_rooms.adjacentRoomId > rooms.id [delete: cascade]

// Category relationships
Ref: categories.parentId > categories.id

// Asset relationships
Ref: assets.categoryId > categories.id
Ref: assets.createdBy > users.id
Ref: assets.currentRoomId > rooms.id
Ref: rfid_tags.assetId - assets.id [delete: cascade]

// Alert relationships
Ref: alerts.assetId > assets.id
Ref: alerts.roomId > rooms.id
Ref: alerts.resolverId > users.id

// Asset Transaction relationships
Ref: asset_transactions.fromUnitId > units.id
Ref: asset_transactions.toUnitId > units.id
Ref: asset_transactions.requesterId > users.id
Ref: asset_transactions.approverId > users.id
Ref: asset_transactions.handoverId > users.id
Ref: asset_transactions.receiverId > users.id

Ref: asset_transaction_items.transactionId > asset_transactions.id [delete: cascade]
Ref: asset_transaction_items.assetId > assets.id
Ref: asset_transaction_items.fromRoomId > rooms.id
Ref: asset_transaction_items.toRoomId > rooms.id

Ref: asset_transaction_histories.transactionId > asset_transactions.id [delete: cascade]
Ref: asset_transaction_histories.changedBy > users.id

// Asset Movement relationships
Ref: asset_movements.requesterId > users.id
Ref: asset_movements.approverId > users.id

Ref: asset_movement_items.movementId > asset_movements.id [delete: cascade]
Ref: asset_movement_items.assetId > assets.id
Ref: asset_movement_items.fromRoomId > rooms.id
Ref: asset_movement_items.toRoomId > rooms.id
Ref: asset_movement_items.movedBy > users.id

Ref: asset_movement_histories.movementId > asset_movements.id [delete: cascade]
Ref: asset_movement_histories.changedBy > users.id

// Asset Book relationships
Ref: asset_books.unitId > units.id
Ref: asset_book_items.bookId > asset_books.id [delete: cascade]
Ref: asset_book_items.assetId > assets.id
Ref: asset_book_items.roomId > rooms.id

// Inventory Session relationships
Ref: inventory_sessions.createdBy > users.id
Ref: inventory_session_units.inventorySessionId > inventory_sessions.id [delete: cascade]
Ref: inventory_session_units.unitId > units.id
Ref: inventory_session_members.inventorySessionId > inventory_sessions.id [delete: cascade]
Ref: inventory_session_members.userId > users.id

// Inventory Sub relationships
Ref: inventory_subs.inventorySessionUnitId > inventory_session_units.id [delete: cascade]
Ref: inventory_subs.createdBy > users.id
Ref: sub_inventory_members.subInventoryId > inventory_subs.id [delete: cascade]
Ref: sub_inventory_members.userId > users.id

// Inventory Group relationships
Ref: inventory_groups.subInventoryId > inventory_subs.id [delete: cascade]
Ref: inventory_groups.createdBy > users.id
Ref: inventory_group_members.groupId > inventory_groups.id [delete: cascade]
Ref: inventory_group_members.userId > users.id
Ref: inventory_group_assignments.groupId > inventory_groups.id [delete: cascade]
Ref: inventory_group_assignments.unitId > units.id

// Inventory Result relationships
Ref: inventory_results.inventorySessionId > inventory_sessions.id [delete: cascade]
Ref: inventory_results.assetId > assets.id
Ref: inventory_results.roomId > rooms.id
Ref: inventory_results.scannedBy > users.id

// Liquidation relationships
Ref: liquidation_proposals.proposerId > users.id
Ref: liquidation_proposals.unitId > units.id
Ref: liquidation_proposal_items.proposalId > liquidation_proposals.id [delete: cascade]
Ref: liquidation_proposal_items.assetId > assets.id
Ref: liquidation_histories.proposalId > liquidation_proposals.id [delete: cascade]
Ref: liquidation_histories.changedBy > users.id

// File URL relationships
Ref: file_url_inventory_sessions.inventorySessionId > inventory_sessions.id [delete: cascade]
Ref: file_url_inventory_sessions.fileUrlId > file_urls.id [delete: cascade]

// Manager Permission relationships
Ref: manager_permissions.userId > users.id
Ref: manager_permissions.unitId > units.id
