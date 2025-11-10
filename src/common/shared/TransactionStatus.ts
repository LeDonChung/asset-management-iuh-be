export enum TransactionStatus {
    DRAFT = 'DRAFT',           // Bản nháp
    PROPOSED = 'PROPOSED',        // Đề xuất bàn giao (gửi lên phòng quản trị)
    APPROVED = 'APPROVED',        // Phòng quản trị chấp nhận - tự động cập nhật tài sản
    RECEIVED = 'RECEIVED',        // Đơn vị đích đã tiếp nhận tài sản
    REJECTED = 'REJECTED',        // Phòng quản trị từ chối
}
