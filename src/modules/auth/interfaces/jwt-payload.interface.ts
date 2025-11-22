export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: string[];
  accessScopeTypes: string[];
  fullName: string; 
  unitId: string;
}
