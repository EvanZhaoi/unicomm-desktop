/**
 * Windows 用户信息模块
 * 
 * 通过 Tauri 后端获取当前 Windows 登录用户的相关信息。
 * 这些信息用于桌面认证流程，识别当前操作用户的身份。
 * 
 * ## 获取的信息
 * - **username**: Windows 用户名（如 "zhao.evan"）
 * - **domain**: 用户所属域（企业环境），无则为 null
 * - **computerName**: 计算机名称
 * - **os**: 操作系统名称（如 "Windows 11"）
 * - **osVersion**: 操作系统版本号
 * 
 * ## 使用示例
 * ```typescript
 * import { getCurrentWindowsUser } from '@/desktop/user';
 * 
 * const userInfo = await getCurrentWindowsUser();
 * console.log(`当前用户: ${userInfo.domain}\\${userInfo.username}`);
 * console.log(`计算机: ${userInfo.computerName}`);
 * ```
 * 
 * @module desktop/user
 * @requires @tauri-apps/api/core (Tauri 后端)
 */

export interface WindowsUserInfo {
  /** Windows 用户名 */
  username: string;
  /** 用户所属域，企业环境可能为 null */
  domain: string | null;
  /** 计算机名称 */
  computerName: string;
  /** 操作系统名称 */
  os: string;
  /** 操作系统版本号 */
  osVersion: string;
}

/**
 * 获取当前 Windows 登录用户信息
 * 
 * 调用 Tauri 后端命令 `get_current_windows_user` 获取当前登录的
 * Windows 用户信息。这些信息将用于桌面认证流程。
 * 
 * @returns Promise<WindowsUserInfo> 当前 Windows 用户的信息
 * @throws 当 Tauri 后端不可用或命令执行失败时抛出异常
 * 
 * @example
 * ```typescript
 * try {
 *   const user = await getCurrentWindowsUser();
 *   console.log(`欢迎 ${user.username}`);
 * } catch (error) {
 *   console.error('无法获取用户信息:', error);
 * }
 * ```
 */
export async function getCurrentWindowsUser(): Promise<WindowsUserInfo> {
  // 动态导入 Tauri API，兼容非 Tauri 环境
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<WindowsUserInfo>("get_current_windows_user");
}