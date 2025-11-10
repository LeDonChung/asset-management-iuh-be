import { Expose, Type } from 'class-transformer';
import { InventorySessionResponseDto } from './inventory-response.dto';

export class CopyInventoryResponseDto {
  @Expose()
  @Type(() => InventorySessionResponseDto)
  newInventorySession: InventorySessionResponseDto;

  @Expose()
  sourceInventorySessionId: string;

  @Expose()
  copyOptions: {
    copyMembers: boolean;
    copyGroups: boolean;
    copyAssignments: boolean;
    copyFileUrls: boolean;
    copySubInventories: boolean;
  };

  @Expose()
  copyResults: {
    membersCopied: number;
    groupsCopied: number;
    assignmentsCopied: number;
    fileUrlsCopied: number;
    subInventoriesCopied: number;
  };

  @Expose()
  copiedAt: Date;
}
