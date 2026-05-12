export interface DeviceInfo {
  deviceId: string;
  computerName: string;
  os: string;
  osVersion: string;
  appVersion: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DeviceInfo>("get_device_info");
}