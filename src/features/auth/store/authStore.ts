/**
 * 认证状态管理模块 (Zustand Store)
 *
 * 管理 UniComm Desktop 的认证状态，包括：
 * - 当前用户信息（DesktopUserInfo）
 * - 访问令牌（accessToken）
 * - 认证状态（AuthStatus）
 * - 错误详情（AuthError）
 *
 * ## 认证状态机
 *
 * ```
 * [App Start]
 *     │
 *     ▼
 * [authStatus = 'checking']
 *     │
 *     ▼
 * getCurrentWindowsUser() + getDeviceInfo()
 *     │
 *     ▼
 * verifyDesktopApi(request)
 *     │
 *     ├─── 成功 ──→ [authStatus = 'verified', 保存 currentUser + accessToken]
 *     │
 *     ├─── 401 用户不存在 ──→ [authStatus = 'rejected', errorCode = 'USER_NOT_FOUND']
 *     │
 *     ├─── 403 用户停用 ──→ [authStatus = 'rejected', errorCode = 'USER_DISABLED']
 *     │
 *     ├─── 网络错误 ──→ [authStatus = 'offline', errorCode = 'NETWORK_ERROR']
 *     │
 *     └─── 服务错误 ──→ [authStatus = 'rejected', errorCode = 'SERVICE_UNAVAILABLE']
 * ```
 *
 * ## 认证流程说明
 *
 * ### 1. 应用启动
 * - `App.tsx` 初始化时调用 `verifyDesktopUser()`
 * - 状态立即设为 `"checking"` 开始验证
 *
 * ### 2. 获取客户端信息
 * - 通过 Tauri 命令获取设备信息 (`getDeviceInfo`)
 * - 通过 Tauri 命令获取 Windows 用户信息 (`getCurrentWindowsUser`)
 *
 * ### 3. 验证请求
 * - 调用后端 `/auth/desktop/verify` 接口
 * - 携带 deviceId、username、computerName、os
 *
 * ### 4. 验证结果
 * - **成功**: 设置 `currentUser` + `accessToken`，状态设为 `"verified"`
 * - **用户不存在**: 状态设为 `"rejected"`, errorCode = `'USER_NOT_FOUND'`
 * - **用户停用**: 状态设为 `"rejected"`, errorCode = `'USER_DISABLED'`
 * - **网络错误**: 状态设为 `"offline"`
 * - **服务错误**: 状态设为 `"rejected"`, errorCode = `'SERVICE_UNAVAILABLE'`
 *
 * ### 5. 后续请求
 * - `services/request.ts` 的请求拦截器会读取 `accessToken`
 * - 自动为每个请求添加 `Authorization: Bearer <token>` 头
 * - 若收到 401/403 响应，拦截器调用 `clearSession()` 清除会话
 *
 * ## 使用示例
 * ```typescript
 * import { useAuthStore } from '@/features/auth/store/authStore';
 *
 * function MyComponent() {
 *   const { currentUser, authStatus, authError, verifyDesktopUser, clearSession } = useAuthStore();
 *
 *   if (authStatus === 'checking') {
 *     return <div>正在验证身份...</div>;
 *   }
 *
 *   if (authStatus === 'rejected') {
 *     return <div>认证失败: {authError?.message}</div>;
 *   }
 *
 *   if (authStatus === 'offline') {
 *     return <div>网络连接失败</div>;
 *   }
 *
 *   return <div>欢迎 {currentUser?.displayName}</div>;
 * }
 * ```
 *
 * @module features/auth/store
 * @requires zustand
 */

import { create } from 'zustand';
import type { AuthStatus, DesktopUserInfo, AuthError } from '../types/auth.types';
import { getDeviceInfo } from '@/desktop/device/DeviceService';
import { getCurrentWindowsUser } from '@/desktop/user/getCurrentWindowsUser';
import { verifyDesktopApi } from '../api/verifyDesktopApi';

/**
 * 认证状态存储的接口定义
 */
interface AuthState {
  /** 当前登录用户的信息，未认证时为 null */
  currentUser: DesktopUserInfo | null;
  /** 访问令牌，用于 API 认证，null 表示未认证 */
  accessToken: string | null;
  /** 当前认证状态，参见 AuthStatus 类型 */
  authStatus: AuthStatus;
  /** 认证错误详情，用于 UI 展示错误信息 */
  authError: AuthError | null;
  /**
   * 验证桌面用户身份
   *
   * 完整的验证流程：
   * 1. 获取设备信息 (deviceId, computerName, os, osVersion, appVersion)
   * 2. 获取 Windows 用户信息 (username, domain)
   * 3. 组合 DesktopVerifyRequest
   * 4. 调用后端 /auth/desktop/verify 接口
   * 5. 根据结果更新状态
   *
   * @returns Promise<boolean> 验证是否成功
   */
  verifyDesktopUser: () => Promise<boolean>;
  /**
   * 清除当前会话
   *
   * 重置所有认证相关状态，用于：
   * - 响应拦截器检测到 401/403 时自动调用
   * - 用户主动退出登录时调用
   * - 清除后 authStatus 将重置为 "checking"
   */
  clearSession: () => void;
}

/**
 * 认证错误代码枚举
 */
export enum AuthErrorCode {
  /** 用户不存在 */
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  /** 用户已停用 */
  USER_DISABLED = 'USER_DISABLED',
  /** 设备未授权 */
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Token 无效 */
  TOKEN_INVALID = 'TOKEN_INVALID',
}

/**
 * 根据 HTTP 错误状态码获取错误代码
 */
function getErrorCodeFromHttpStatus(status: number): AuthErrorCode {
  switch (status) {
    case 401:
      return AuthErrorCode.USER_NOT_FOUND;
    case 403:
      return AuthErrorCode.USER_DISABLED;
    default:
      return AuthErrorCode.SERVICE_UNAVAILABLE;
  }
}

/**
 * 认证状态管理 Store
 *
 * 使用 Zustand 管理的全局认证状态。
 * 整个应用应使用同一个 store 实例以保证状态同步。
 */
export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  currentUser: null,
  accessToken: null,
  authStatus: 'checking',
  authError: null,

  /**
   * 验证桌面用户身份
   *
   * 完整的验证流程：
   * 1. 设置状态为 "checking"（正在验证）
   * 2. 获取设备信息 (getDeviceInfo)
   * 3. 获取 Windows 用户信息 (getCurrentWindowsUser)
   * 4. 组合 DesktopVerifyRequest
   * 5. 调用后端 /auth/desktop/verify 接口
   * 6. 根据结果更新状态
   */
  verifyDesktopUser: async () => {
    // 开始验证，先将状态设为 checking
    set({ authStatus: 'checking', authError: null });

    try {
      // ---- Step 1: 获取设备信息 ----
      const deviceInfo = getDeviceInfo();

      // ---- Step 2: 获取 Windows 用户信息 ----
      const userInfo = await getCurrentWindowsUser();

      // ---- Step 3: 组合请求参数 ----
      const requestData = {
        username: userInfo.username,
        domain: userInfo.domain || '',
        computerName: deviceInfo.computerName,
        deviceId: deviceInfo.deviceId,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
      };

      // ---- Step 4: 调用后端 verify 接口 ----
      const response = await verifyDesktopApi(requestData);

      // ---- Step 5: 处理响应 ----
      if (response.code === 200 && response.data) {
        // 认证成功，保存用户信息和 token
        set({
          currentUser: {
            username: response.data.username,
            employeeNo: response.data.employeeNo,
            displayName: response.data.displayName,
            departmentName: response.data.departmentName,
            permissions: response.data.permissions || [],
          },
          accessToken: response.data.accessToken,
          authStatus: 'verified',
          authError: null,
        });
        return true;
      } else {
        // 认证失败（业务错误）
        set({
          authStatus: 'rejected',
          authError: {
            code: 'AUTH_FAILED',
            message: response.message || '认证失败',
          },
        });
        return false;
      }
    } catch (error: unknown) {
      // ---- 处理异常情况 ----
      let errorCode: AuthErrorCode;
      let errorMessage: string;

      if (error && typeof error === 'object' && 'response' in error) {
        // axios 错误响应
        const axiosError = error as { response?: { status?: number }; message?: string };
        const httpStatus = axiosError.response?.status;
        errorCode = httpStatus ? getErrorCodeFromHttpStatus(httpStatus) : AuthErrorCode.SERVICE_UNAVAILABLE;
        errorMessage = axiosError.message || '认证服务异常';
      } else if (error && typeof error === 'object' && 'code' in error) {
        // 网络错误或超时
        const err = error as { code?: string; message?: string };
        if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
          errorCode = AuthErrorCode.NETWORK_ERROR;
          errorMessage = '网络连接失败，请检查网络';
        } else {
          errorCode = AuthErrorCode.SERVICE_UNAVAILABLE;
          errorMessage = err.message || '认证服务异常';
        }
      } else {
        errorCode = AuthErrorCode.SERVICE_UNAVAILABLE;
        errorMessage = '认证服务异常';
      }

      // 根据错误类型设置状态
      const authStatus: AuthStatus =
        errorCode === AuthErrorCode.NETWORK_ERROR ? 'offline' : 'rejected';

      set({
        authStatus,
        authError: {
          code: errorCode,
          message: errorMessage,
        },
      });

      return false;
    }
  },

  /**
   * 清除当前会话
   *
   * 重置所有认证状态，包括：
   * - 清除 currentUser（下次访问需要重新认证）
   * - 清除 accessToken（需要重新获取）
   * - 重置 authStatus 为 "checking"（触发 UI 显示认证界面）
   *
   * 调用场景：
   * - `services/request.ts` 响应拦截器检测到 401/403
   * - 用户主动点击"退出登录"
   * - 需要强制重新认证的情况
   */
  clearSession: () =>
    set({
      currentUser: null,
      accessToken: null,
      authStatus: 'checking',
      authError: null,
    }),
}));