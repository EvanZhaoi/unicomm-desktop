/**
 * 认证状态管理模块 (Zustand Store)
 *
 * 管理 UniComm Desktop 的认证状态，包括：
 * - 当前用户信息（DesktopUserInfo）
 * - 访问令牌（accessToken）
 * - 认证状态（AuthStatus）
 * - 错误详情（AuthError）
 * - Session 持久化
 *
 * ## 认证状态机
 *
 * ```
 * [App Start]
 *     │
 *     ▼
 * loadSession() → 检查是否已有有效 Session
 *     │
 *     ├─── 有有效 Session ──→ [authStatus = 'verified', 恢复用户]
 *     │
 *     └─── 无有效 Session ──↓
 *             │
 *             ▼
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
 *
 * ## 401 Recovery Flow
 *
 * Token 失效 (401/403)
 *     │
 *     ▼
 * clearSession() → 清除本地 Session
 *     │
 *     ▼
 * verifyDesktopUser() → 重新认证
 *     │
 *     ▼
 * 重新建立 Session
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
import { verifyDesktopApi, type DesktopVerifyResponse } from '../api/verifyDesktopApi';
import { AuthError as HttpAuthError, NetworkError } from '@/core/http';
import { sessionStorageService } from '@/services/sessionStorageService';

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
   * 初始化认证
   * 应用启动时调用，尝试恢复之前保存的 Session
   */
  initAuth: () => Promise<void>;

  /**
   * 验证桌面用户身份
   *
   * 完整的验证流程：
   * 1. 获取设备信息 (deviceId, computerName, os, osVersion, appVersion)
   * 2. 获取 Windows 用户信息 (username, domain)
   * 3. 组合 DesktopVerifyRequest
   * 4. 调用后端 /auth/desktop/verify 接口
   * 5. 根据结果更新状态
   * 6. 成功后保存 Session 到持久化存储
   *
   * @returns Promise<boolean> 验证是否成功
   */
  verifyDesktopUser: () => Promise<boolean>;

  /**
   * 清除当前会话
   *
   * 重置所有认证相关状态，用于：
   * - 响应拦截器检测到 401/403 时自动调用（触发 401 Recovery）
   * - 用户主动退出登录时调用
   * - 清除后 authStatus 将重置为 "checking"
   */
  clearSession: () => Promise<void>;

  /**
   * 恢复会话
   * 401/403 时调用，从头开始重新认证流程
   */
  recoverSession: () => Promise<void>;
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
  /** Session 已过期 */
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * 根据错误类型获取错误代码
 */
function getErrorCodeFromError(error: unknown): AuthErrorCode {
  if (error instanceof HttpAuthError) {
    return error.statusCode === 401 ? AuthErrorCode.USER_NOT_FOUND : AuthErrorCode.USER_DISABLED;
  }
  if (error instanceof NetworkError) {
    return AuthErrorCode.NETWORK_ERROR;
  }
  return AuthErrorCode.SERVICE_UNAVAILABLE;
}

/**
 * 获取错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '认证服务异常';
}

/**
 * 认证状态管理 Store
 *
 * 使用 Zustand 管理的全局认证状态。
 * 整个应用应使用同一个 store 实例以保证状态同步。
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // 初始状态
  currentUser: null,
  accessToken: null,
  authStatus: 'checking',
  authError: null,

  /**
   * 初始化认证
   *
   * 应用启动时调用此方法：
   * 1. 尝试从持久化存储加载之前保存的 Session
   * 2. 如果 Session 有效，恢复认证状态
   * 3. 如果 Session 无效或不存在，执行完整的认证流程
   */
  initAuth: async () => {
    console.log('[AuthStore] Initializing auth...');

    // 尝试加载保存的 Session
    const savedSession = await sessionStorageService.loadSession();

    if (savedSession) {
      console.log('[AuthStore] Found saved session, restoring...');

      // 恢复保存的 Session
      set({
        currentUser: savedSession.currentUser,
        accessToken: savedSession.accessToken,
        authStatus: 'verified',
        authError: null,
      });

      console.log('[AuthStore] Session restored for:', savedSession.currentUser.username);
      return;
    }

    // 没有保存的 Session，执行完整认证流程
    console.log('[AuthStore] No saved session, performing full auth...');
    await get().verifyDesktopUser();
  },

  /**
   * 验证桌面用户身份
   */
  verifyDesktopUser: async () => {
    // 开始验证，先将状态设为 checking
    set({ authStatus: 'checking', authError: null });

    try {
      // ---- Step 1: 获取设备信息 ----
      const deviceInfo = await getDeviceInfo();

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
      const response: DesktopVerifyResponse = await verifyDesktopApi(requestData);

      // ---- Step 5: 处理响应 ----
      const userData: DesktopUserInfo = {
        username: response.username,
        employeeNo: response.employeeNo,
        displayName: response.displayName,
        departmentName: response.departmentName,
        permissions: response.permissions || [],
      };

      // ---- Step 6: 保存到状态 ----
      set({
        currentUser: userData,
        accessToken: response.accessToken,
        authStatus: 'verified',
        authError: null,
      });

      // ---- Step 7: 持久化 Session ----
      // 计算 Token 过期时间（24 小时）
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      await sessionStorageService.saveSession({
        accessToken: response.accessToken,
        currentUser: userData,
        deviceInfo,
        authStatus: 'verified',
        authTime: Date.now(),
        expiresAt,
      });

      console.log('[AuthStore] Auth successful:', response.username);
      return true;
    } catch (error: unknown) {
      // ---- 处理异常情况 ----
      const errorCode = getErrorCodeFromError(error);
      const errorMessage = getErrorMessage(error);

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

      console.log('[AuthStore] Auth failed:', errorCode, errorMessage);
      return false;
    }
  },

  /**
   * 清除当前会话
   */
  clearSession: async () => {
    // 清除持久化的 Session
    await sessionStorageService.clearSession();

    // 清除内存中的状态
    set({
      currentUser: null,
      accessToken: null,
      authStatus: 'checking',
      authError: null,
    });

    console.log('[AuthStore] Session cleared');
  },

  /**
   * 恢复会话
   *
   * 当检测到 401/403 或 Session 过期时调用。
   * 先清除当前 Session，然后重新执行认证流程。
   */
  recoverSession: async () => {
    console.log('[AuthStore] Recovering session...');

    // 先清除当前 Session
    await get().clearSession();

    // 重新执行认证
    await get().verifyDesktopUser();
  },
}));