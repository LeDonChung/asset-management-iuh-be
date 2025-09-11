export enum AssetStatus {
    IN_USE = 'IN_USE', // đang sử dụng
    WAITING_HANDOVER = 'WAITING_HANDOVER', // chờ bàn giao
    WAITING_RECEIVE = 'WAITING_RECEIVE', // chờ tiếp nhận
    DAMAGED = 'DAMAGED', // hư hỏng
    LOST = 'LOST', // đã mất
    PROPOSED_LIQUIDATION = 'PROPOSED_LIQUIDATION', // đề xuất thanh lý
    LIQUIDATED = 'LIQUIDATED', // đã thanh lý
    WAITING_ALLOCATION = 'WAITING_ALLOCATION', // chờ phân bổ
  }