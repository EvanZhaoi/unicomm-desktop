/**
 * 认证状态管理模块 (Zustand Store)
 * 
 * 管理 UniComm Desktop 的认证状态，包括：
 * - 当前用户信息（DesktopUserInfo）
 * - 访问令牌（accessToken）
 * - 认证状态（AuthStatus）
 * 
 * ## 认证状态机
 * 
 * ```
 *                    ┌─────────────────────────────────────────┐
 *                    │                                         │
 *                    ↓                                         │
 *  ┌──────────┐  verifyDesktopUser()  ┌──────────────────┐   │
 *  │ "checking" │─────────────────────→│   验证中...      │   │
 *  └──────────┘                        └────────┬─────────┘   │
 *                                               │             │
 *                              成功 ←───────────┼──────────→ 失败
 *                                │              │              │
 *                                ↓              ↓              ↓
 *                       ┌────────────┐  ┌────────────┐  ┌───────────┐
 *                       │ "verified" │  │ "offline"  │  │ "rejected"│
 *                       └────────────┘  └────────────┘  └───────────┘
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
 * - **注意**: 当前为模拟实现，实际 API 尚未对接
 * 
 * ### 4. 验证结果
 * - **成功**: 设置 `currentUser` + `accessToken`，状态设为 `"verified"`
 * - **失败**: 状态设为 `"rejected"`
 * - **网络错误**: 状态设为 `"offline"`
 * 
 * ### 5. 后续请求
 * - `services/request.ts` 的请求拦截器会读取 `accessToken`
 * - 自动为每个请求添加 `Authorization: Bearer <token>` 头
 * - 若收到 401/403 响应，拦截器调用 `clearSession()` 清除会话
 * 
 * ## clearSession 的作用
 * 
 * 当检测到认证失败（401/403）时调用：
 * 1. 清除 `currentUser`（设为 null）
 * 2. 清除 `accessToken`（设为 null）
 * 3. 重置 `authStatus` 为 `"checking"`
 * 
 * UI 检测到 `authStatus !== "verified"` 后会显示 `AuthStatusView`，
 * 引导用户重新认证或显示错误信息。
 * 
 * ## 使用示例
 * ```typescript
 * import { useAuthStore } from '@/features/auth/store/authStore';
 * 
 * function MyComponent() {
 *   const { currentUser, authStatus, verifyDesktopUser, clearSession } = useAuthStore();
 * 
 *   // 在受保护组件中检查认证状态
 *   if (authStatus === 'checking') {
 *     return <div>正在验证身份...</div>;
 *   }
 * 
 *   if (authStatus === 'rejected') {
 *     return <div>您没有访问权限</div>;
 *   }
 * 
 *   if (authStatus === 'offline') {
 *     return <div>网络连接失败</div>;
 *   }
 * 
 *   // authStatus === 'verified' 时，正常渲染
 *   return <div>欢迎 {currentUser?.displayName}</div>;
 * }
 * ```
 * 
 * @module features/auth/store
 * @requires zustand
 */

import { create } from "zustand";
import type { AuthStatus, DesktopUserInfo } from "../types/auth.types";

/**
 * 认证状态存储的接口定义
 * 
 * 定义了认证 store 暴露的所有状态和方法。
 */
interface AuthState {
  /** 当前登录用户的信息，未认证时为 null */
  currentUser: DesktopUserInfo | null;
  /** 访问令牌，用于 API 认证，null 表示未认证 */
  accessToken: string | null;
  /** 当前认证状态，参见 AuthStatus 类型 */
  authStatus: AuthStatus;
  /**
   * 验证桌面用户身份
   * 
   * @param clientInfo - 客户端信息，包含 deviceId、username、computerName、os
   * @returns Promise<boolean> 验证是否成功
   */
  verifyDesktopUser: (clientInfo: unknown) => Promise<boolean>;
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
 * 认证状态管理 Store
 * 
 * 使用 Zustand 管理的全局认证状态。
 * 整个应用应使用同一个 store 实例以保证状态同步。
 */
export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  currentUser: null,
  accessToken: null,
  authStatus: "checking",

  /**
   * 验证桌面用户身份
   * 
   * 完整的验证流程：
   * 1. 设置状态为 "checking"（正在验证）
   * 2. 调用后端 `/auth/desktop/verify` 接口
   * 3. 根据结果更新状态：
   *    - 成功：设置用户信息和 token，状态设为 "verified"
   *    - 失败：状态设为 "rejected"
   *    - 异常：状态设为 "rejected"
   * 
   * @param clientInfo - 客户端信息对象，包含：
   *   - deviceId: 设备唯一标识
   *   - username: Windows 用户名
   *   - computerName: 计算机名称
   *   - os: 操作系统信息
   * @returns Promise<boolean> 验证是否成功
   */
  verifyDesktopUser: async (clientInfo) => {
    // 开始验证，先将状态设为 checking
    set({ authStatus: "checking" });
    try {
      // TODO: Call /api/v1/auth/desktop/verify when server is ready
      // For now, simulate successful verification
      // 模拟网络请求延迟（实际对接后移除）
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 验证成功，设置用户信息和 token
      // TODO: 实际应从 response.data 中获取用户信息
      set({
        currentUser: {
          username: 'evan.zhao',
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
      // 验证失败，设置状态为 rejected
      set({ authStatus: "rejected" });
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
      authStatus: "checking",
    }),
}));