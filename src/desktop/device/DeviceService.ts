/**
 * 设备信息服务模块
 * 
 * 通过 Tauri 后端获取当前设备的硬件和软件信息。
 * 这些信息用于：
 * - 设备注册和认证
 * - 客户端标识（deviceId）
 * - 运维支持（确定操作系统版本等）
 * 
 * ## 获取的信息
 * - **deviceId**: 设备唯一标识符（由后端生成或硬件指纹）
 * - **computerName**: 计算机名称
 * - **os**: 操作系统名称
 * - **osVersion**: 操作系统完整版本号
 * - **appVersion**: 当前 UniComm Desktop 应用版本号
 * 
 * ## 使用示例
 * ```typescript
 * import { getDeviceInfo } from '@/desktop/device';
 * 
 * const deviceInfo = await getDeviceInfo();
 * console.log(`设备ID: ${deviceInfo.deviceId}`);
 * console.log(`系统: ${deviceInfo.os} ${deviceInfo.osVersion}`);
 * console.log(`应用版本: ${deviceInfo.appVersion}`);
 * ```
 * 
 * @module desktop/device
 * @requires @tauri-apps/api/core (Tauri 后端)
 */

export interface DeviceInfo {
  /** 设备唯一标识符，用于服务端识别和认证 */
  deviceId: string;
  /** 计算机名称（与 Windows 系统属性中的计算机名一致） */
  computerName: string;
  /** 操作系统名称（如 "Windows 10", "Windows 11"） */
  os: string;
  /** 操作系统版本号（如 "10.0.19045.1234"） */
  osVersion: string;
  /** 当前应用的版本号（如 "1.0.0"） */
  appVersion: string;
}

/**
 * 获取当前设备信息
 * 
 * 调用 Tauri 后端命令 `get_device_info` 获取当前设备的硬件和软件信息。
 * 返回的信息包括设备标识、操作系统和应用版本，用于桌面认证流程。
 * 
 * @returns Promise<DeviceInfo> 当前设备的详细信息
 * @throws 当 Tauri 后端不可用或命令执行失败时抛出异常
 * 
 * @example
 * ```typescript
 * try {
 *   const info = await getDeviceInfo();
 *   // 将设备信息发送到服务端进行注册
 *   await registerDevice(info);
 * } catch (error) {
 *   console.error('无法获取设备信息:', error);
 * }
 * ```
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  // 动态导入 Tauri API，兼容非 Tauri 环境（开发模式下可能不可用）
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DeviceInfo>("get_device_info");
}