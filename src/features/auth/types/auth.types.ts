export type AuthStatus = "checking" | "verified" | "rejected" | "offline";

export interface DesktopUserInfo {
  userId: number;
  employeeNo: string;
  displayName: string;
  departmentName: string;
  permissions: string[];
}

export interface AuthState {
  currentUser: DesktopUserInfo | null;
  accessToken: string | null;
  authStatus: AuthStatus;
}