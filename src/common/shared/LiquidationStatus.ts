
export enum LiquidationStatus {
    DRAFT = 'DRAFT',         // Bản nháp, chưa gửi đề xuất
    PROPOSED = 'PROPOSED',     // Đề xuất thanh lý
    APPROVED = 'APPROVED',     // Phòng quản trị chấp nhận và gửi minh chứng
    REJECTED = 'REJECTED',     // Phòng quản trị từ chối
    FINALIZED = 'FINALIZED'    // Bên trường duyệt xong, cập nhật minh chứng hoàn tất
}