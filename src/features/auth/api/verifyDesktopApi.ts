/**
 * 桌面认证 API 模块
 * 
 * 调用后端 `/auth/desktop/verify` 接口验证桌面客户端身份。
 * 这是桌面应用独有的认证流程，区别于 Web 端的用户名密码登录。
 * 
 * ## 认证流程
 * 1. 前端收集设备信息（deviceId、computerName 等）
 * 2. 调用此 API 进行验证
 * 3. 后端根据设备信息和 Windows 用户身份判断是否有权访问
 * 4. 返回用户信息（userId、displayName、permissions 等）
 * 
 * ## 请求数据
 * 需要提交客户端信息供服务端验证：
 * - deviceId: 设备唯一标识
 * - username: Windows 用户名
 * - computerName: 计算机名称
 * - os: 操作系统信息
 * 
 * @module features/auth/api
 */

import axios from "axios";

/** 后端 API 基础地址（开发环境） */
const BASE_URL = "http://localhost:28080/api/v1";

/**
 * 客户端信息接口
 * 
 * 包含用于认证的设备信息和用户信息。
 */
export interface ClientInfo {
  /** 设备唯一标识符 */
  deviceId: string;
  /** Windows 用户名 */
  username: string;
  /** 计算机名称 */
  computerName: string;
  /** 操作系统信息 */
  os: string;
}

/**
 * 验证桌面客户端身份
 * 
 * 调用后端 `/auth/desktop/verify` 接口进行桌面认证。
 * 该接口会检查设备 ID 和 Windows 用户是否在白名单中。
 * 
 * @param clientInfo - 客户端设备及用户信息
 * @returns Promise 后端返回的用户信息（userId、displayName、permissions 等）
 * @throws 网络错误、超时（10秒）或服务端返回错误时抛出异常
 * 
 * @example
 * ```typescript
 * try {
 *   const userInfo = await verifyDesktopApi({
 *     deviceId: 'DVC-12345678',
 *     username: 'zhao.evan',
 *     computerName: 'EVAN-PC',
 *     os: 'Windows 11'
 *   });
 *   console.log(`欢迎 ${userInfo.displayName}`);
 * } catch (error) {
 *   console.error('认证失败:', error);
 * }
 * ```
 */
export const verifyDesktopApi = async (clientInfo: ClientInfo) => {
  const response = await axios.post(`${BASE_URL}/auth/desktop/verify`, clientInfo, {
    timeout: 10000, // 10 秒超时
  });
  return response.data;
};