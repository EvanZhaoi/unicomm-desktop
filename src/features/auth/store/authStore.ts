import { create } from "zustand";
import type { AuthStatus, DesktopUserInfo } from "../types/auth.types";

interface AuthState {
  currentUser: DesktopUserInfo | null;
  accessToken: string | null;
  authStatus: AuthStatus;
  verifyDesktopUser: (clientInfo: unknown) => Promise<boolean>;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  accessToken: null,
  authStatus: "checking",

  verifyDesktopUser: async (clientInfo) => {
    set({ authStatus: "checking" });
    try {
      // TODO: Call /api/v1/auth/desktop/verify when server is ready
      // For now, simulate successful verification
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set({
        currentUser: {
          userId: 10001,
          employeeNo: "E10001",
          displayName: "Evan Zhao",
          departmentName: "IT Department",
          permissions: ["memo:read", "memo:write"],
        },
        accessToken: "mock-token",
        authStatus: "verified",
      });
      return true;
    } catch {
      set({ authStatus: "rejected" });
      return false;
    }
  },

  clearSession: () =>
    set({
      currentUser: null,
      accessToken: null,
      authStatus: "checking",
    }),
}));