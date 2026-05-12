export interface WindowsUserInfo {
  username: string;
  domain: string | null;
  computerName: string;
  os: string;
  osVersion: string;
}

export async function getCurrentWindowsUser(): Promise<WindowsUserInfo> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<WindowsUserInfo>("get_current_windows_user");
}