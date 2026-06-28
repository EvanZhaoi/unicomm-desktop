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
import {
  refreshTokenApi,
  verifyDesktopApi,
  verifyDeviceApi,
  type DesktopVerifyResponse,
  type DesktopVerifyRequest,
} from '../api/verifyDesktopApi';
import { ApiError, AuthError as HttpAuthError, NetworkError } from '@/core/http';
import { sessionStorageService } from '@/services/sessionStorageService';
import type { DeviceInfo } from '@/desktop/device/DeviceService';

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
  pendingVerificationId: string | null;
  pendingDeviceInfo: DeviceInfo | null;

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
  submitDeviceVerification: (code: string) => Promise<boolean>;

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
  if (error instanceof ApiError) {
    return error.statusCode === 401 ? AuthErrorCode.USER_NOT_FOUND : AuthErrorCode.SERVICE_UNAVAILABLE;
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
 * 认证流程单飞锁。
 *
 * Tauri 启动阶段会同时挂载多个组件并触发多条接口请求，如果这些请求同时命中
 * 401/403，不能让每条请求都各自清 Session、重新识别 Windows 用户，否则状态会
 * 在 checking/verified 之间互相覆盖。这里用 Promise 复用正在执行的认证任务。
 */
let initAuthPromise: Promise<void> | null = null;
let verifyDesktopUserPromise: Promise<boolean> | null = null;
let recoverSessionPromise: Promise<void> | null = null;

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
  pendingVerificationId: null,
  pendingDeviceInfo: null,

  /**
   * 初始化认证
   *
   * 应用启动时调用此方法：
   * 1. 尝试从持久化存储加载之前保存的 Session
   * 2. 如果 Session 有效，恢复认证状态
   * 3. 如果 Session 无效或不存在，执行完整的认证流程
   */
  initAuth: async () => {
    if (initAuthPromise) {
      return initAuthPromise;
    }

    initAuthPromise = (async () => {
      // 尝试加载保存的 Session
      const savedSession = await sessionStorageService.loadSession();

      if (savedSession) {
        // 先恢复到内存，刷新接口会自动携带当前 token。
        set({
          currentUser: savedSession.currentUser,
          accessToken: savedSession.accessToken,
          authStatus: 'verified',
          authError: null,
        });

        try {
          const refreshed = await refreshTokenApi();
          const accessToken = refreshed.accessToken || savedSession.accessToken;
          const expiresAt = refreshed.expiresAt || Date.now() + 24 * 60 * 60 * 1000;
          set({ accessToken });
          await sessionStorageService.updateToken(accessToken, expiresAt);
        } catch {
          await get().clearSession();
          await get().verifyDesktopUser();
          return;
        }

        return;
      }

      // 没有保存的 Session，执行完整认证流程
      await get().verifyDesktopUser();
    })().finally(() => {
      initAuthPromise = null;
    });

    return initAuthPromise;
  },

  /**
   * 验证桌面用户身份
   */
  verifyDesktopUser: async () => {
    if (verifyDesktopUserPromise) {
      return verifyDesktopUserPromise;
    }

    verifyDesktopUserPromise = (async () => {
      // 开始验证，先将状态设为 checking
      set({ authStatus: 'checking', authError: null });

      try {
        // ---- Step 1: 获取设备信息 ----
        const deviceInfo = await getDeviceInfo();

        // ---- Step 2: 获取 Windows 用户信息 ----
        const userInfo = await getCurrentWindowsUser();

        // ---- Step 3: 组合请求参数 ----
        const requestData: DesktopVerifyRequest = {
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

        if (response.deviceVerificationRequired && response.verificationId) {
          set({
            authStatus: 'device_verification',
            authError: {
              code: AuthErrorCode.DEVICE_NOT_TRUSTED,
              message: '当前设备需要验证码确认',
            },
            pendingVerificationId: response.verificationId,
            pendingDeviceInfo: deviceInfo,
          });
          return false;
        }

        await persistVerifiedSession(response, deviceInfo, set);
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
        return false;
      }
    })().finally(() => {
      verifyDesktopUserPromise = null;
    });

    return verifyDesktopUserPromise;
  },

  submitDeviceVerification: async (code: string) => {
    const verificationId = get().pendingVerificationId;
    const deviceInfo = get().pendingDeviceInfo || await getDeviceInfo();
    if (!verificationId) {
      set({
        authStatus: 'rejected',
        authError: {
          code: AuthErrorCode.DEVICE_NOT_TRUSTED,
          message: '设备验证码流程已失效，请刷新后重试',
        },
      });
      return false;
    }

    set({ authStatus: 'checking', authError: null });
    try {
      const response = await verifyDeviceApi({ verificationId, code });
      await persistVerifiedSession(response, deviceInfo, set);
      return true;
    } catch (error) {
      set({
        authStatus: 'device_verification',
        authError: {
          code: AuthErrorCode.DEVICE_NOT_TRUSTED,
          message: getErrorMessage(error),
        },
      });
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
      pendingVerificationId: null,
      pendingDeviceInfo: null,
    });

  },

  /**
   * 恢复会话
   *
   * 当检测到 401/403 或 Session 过期时调用。
   * 先清除当前 Session，然后重新执行认证流程。
   */
  recoverSession: async () => {
    if (recoverSessionPromise) {
      return recoverSessionPromise;
    }

    recoverSessionPromise = (async () => {
      // 先清除当前 Session
      await get().clearSession();

      // 重新执行认证
      await get().verifyDesktopUser();
    })().finally(() => {
      recoverSessionPromise = null;
    });

    return recoverSessionPromise;
  },
}));

async function persistVerifiedSession(
  response: DesktopVerifyResponse,
  deviceInfo: DeviceInfo,
  set: (partial: Partial<AuthState>) => void,
) {
  if (!response.accessToken) {
    throw new Error('认证响应缺少 accessToken');
  }

  const userData: DesktopUserInfo = {
    username: response.username,
    employeeNo: response.employeeNo,
    displayName: response.displayName,
    departmentName: response.departmentName,
    permissions: response.permissions || [],
  };

  set({
    currentUser: userData,
    accessToken: response.accessToken,
    authStatus: 'verified',
    authError: null,
    pendingVerificationId: null,
    pendingDeviceInfo: null,
  });

  await sessionStorageService.saveSession({
    accessToken: response.accessToken,
    currentUser: userData,
    deviceInfo,
    authStatus: 'verified',
    authTime: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
}
