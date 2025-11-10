import { AccessScopeType } from 'src/entities/access-scope.entity';

export class AccessScopeInfoDto {
  type: AccessScopeType;
  unitId?: string;
  unit?: any; // UnitResponseDto
  description?: string;
}

export class EffectiveAccessScopeDto {
  canAccessGlobal: boolean;
  canAccessChildUnits: boolean;
  canAccessOwnUnit: boolean;
  canAccessSelfOnly: boolean;
  accessibleUnitIds: string[];
  primaryAccessType: AccessScopeType; // Loại access scope chính
}
