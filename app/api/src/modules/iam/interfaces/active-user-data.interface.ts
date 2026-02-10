export interface ActiveUserData {
  jti: string;
  refreshTokenId: string;
  sub: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
}
