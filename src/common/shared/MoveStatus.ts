export enum MoveStatus {
    DRAFT = 'DRAFT',                           // Bản nháp - chưa gửi yêu cầu
    PENDING_APPROVAL = 'PENDING_APPROVAL',     // Chờ phê duyệt
    APPROVED = 'APPROVED',                     // Đã phê duyệt - sẵn sàng thực hiện
    REJECTED = 'REJECTED',                     // Bị từ chối
    COMPLETED = 'COMPLETED',                   // Đã hoàn thành di chuyển
    CANCELLED = 'CANCELLED',                   // Đã hủy bỏ
  }
  