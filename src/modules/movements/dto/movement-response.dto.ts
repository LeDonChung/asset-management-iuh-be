import { MoveStatus } from 'src/common/shared/MoveStatus';

export class MovementItemResponseDto {
  id: string;
  assetId: string;
  fromRoomId: string;
  toRoomId: string;
  note?: string;
  movedAt?: Date;
  movedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Populated relationships
  asset?: {
    id: string;
    name: string;
    ktCode: string;
    fixedCode: string;
    specs?: string;
    unit?: string;
    quantity?: number;
    entrydate?: string;
    origin?: string;
    purchasePackage?: number;
    type?: string;
    status?: string;
    currentRoom?: {
      id: string;
      name: string;
      roomCode: string;
      unit?: {
        id: string;
        name: string;
        unitCode: number;
      };
    };
    category?: {
      id: string;
      name: string;
    };
  };
  fromRoom?: {
    id: string;
    name: string;
    code: string;
    unit?: {
      id: string;
      name: string;
      unitCode: number;
    };
  };
  toRoom?: {
    id: string;
    name: string;
    code: string;
    unit?: {
      id: string;
      name: string;
      unitCode: number;
    };
  };
  mover?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class MovementHistoryResponseDto {
  id: string;
  oldStatus: MoveStatus;
  newStatus: MoveStatus;
  note?: string;
  evidenceUrl?: string;
  createdAt: Date;
  changer: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class MovementResponseDto {
  id: string;
  status: MoveStatus;
  requestNote?: string;
  approvalNote?: string;
  rejectionReason?: string;
  approvedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Populated relationships
  requester?: {
    id: string;
    fullName: string;
    email: string;
  };
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
  items: MovementItemResponseDto[];
  histories: MovementHistoryResponseDto[];
}

export class SimplifiedMovementResponseDto {
  id: string;
  status: MoveStatus;
  requestNote?: string;
  approvalNote?: string;
  createdAt: Date;
  updatedAt: Date;
  requester?: {
    id: string;
    fullName: string;
    email: string;
  };
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
  itemCount: number;
}
