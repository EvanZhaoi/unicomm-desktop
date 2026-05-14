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
 * 4. 返回用户信息（username、displayName、permissions 等）
 * 
 * @module features/auth/api
 */

import { client } from '@/core/http';

/**
 * 桌面认证请求参数
 */
export interface DesktopVerifyRequest {
  username: string;
  domain?: string;
  computerName: string;
  deviceId: string;
  os: string;
  osVersion?: string;
  appVersion?: string;
}

/**
 * 桌面认证响应数据
 */
export interface DesktopVerifyResponse {
  username: string;
  employeeNo: string;
  displayName: string;
  departmentName: string;
  permissions: string[];
  accessToken: string;
}

/**
 * 验证桌面客户端身份
 * 
 * 调用后端 `/auth/desktop/verify` 接口进行桌面认证。
 * 该接口会检查设备 ID 和 Windows 用户是否在白名单中。
 * 
 * @param request - 客户端设备及用户信息
 * @returns Promise 后端返回的用户信息（username、displayName、permissions 等）
 * @throws 网络错误、超时或服务端返回错误时抛出异常
 * 
 * @example
 * ```typescript
 * try {
 *   const userInfo = await verifyDesktopApi({
 *     username: 'zhao.evan',
 *     domain: 'COMPANY',
 *     computerName: 'EVAN-PC',
 *     deviceId: 'DVC-12345678',
 *     os: 'Windows',
 *     osVersion: 'Windows 11',
 *     appVersion: '0.1.0'
 *   });
 *   console.log(`欢迎 ${userInfo.displayName}`);
 * } catch (error) {
 *   console.error('认证失败:', error);
 * }
 * ```
 */
export async function verifyDesktopApi(request: DesktopVerifyRequest): Promise<DesktopVerifyResponse> {
  const response = await client.post<DesktopVerifyResponse>(
    '/auth/desktop/verify',
    request
  );
  // 拦截器已处理错误，成功时直接返回响应数据
  return response.data;
}