/**
 * 认证状态与类型定义
 *
 * 定义 UniComm Desktop 认证相关的所有类型，包括：
 * - 认证状态枚举（AuthStatus）
 * - 桌面用户信息结构（DesktopUserInfo）
 * - 认证错误结构（AuthError）
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
 *     ├─── 成功 ──→ [authStatus = 'verified']
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
 * ## AuthStatus 状态说明
 *
 * | 状态 | 说明 | UI 展示 |
 * |------|------|---------|
 * | `checking` | 应用启动，正在验证 Windows 用户身份 | 加载动画 |
 * | `verified` | 验证成功，用户已授权，可正常使用应用 | 正常显示应用 |
 * | `rejected` | 验证失败，用户未授权或已停用 | 错误页面 |
 * | `offline` | 无法连接认证服务器（网络问题或服务宕机） | 离线提示 |
 *
 * ## AuthError 错误代码
 *
 * | 错误代码 | 说明 |
 * |----------|------|
 * | `USER_NOT_FOUND` | 用户不在公司人员系统中 |
 * | `USER_DISABLED` | 用户已停用 |
 * | `DEVICE_NOT_TRUSTED` | 设备未授权（Phase 2） |
 * | `SERVICE_UNAVAILABLE` | 认证服务异常 |
 * | `NETWORK_ERROR` | 网络连接失败 |
 * | `TOKEN_INVALID` | Token 无效或过期 |
 *
 * @module features/auth/types
 */

/**
 * 认证状态枚举
 */
export type AuthStatus = 'checking' | 'verified' | 'rejected' | 'offline';

/**
 * 桌面用户信息结构
 *
 * 从后端 /auth/desktop/verify 接口返回的用户信息。
 * 注意：使用 username 作为用户标识，不再使用 userId。
 */
export interface DesktopUserInfo {
  /** Windows 用户名，用于数据隔离和会话关联 */
  username: string;
  /** 员工工号（如 "E10001"） */
  employeeNo: string;
  /** 显示名称，用于 UI 展示（如 "Evan Zhao"） */
  displayName: string;
  /** 所属部门名称 */
  departmentName: string;
  /** 权限列表，用于控制功能可见性（如 ["memo:read", "memo:write"]） */
  permissions: string[];
}

/**
 * 认证错误信息结构
 *
 * 用于 UI 展示认证失败的原因。
 */
export interface AuthError {
  /** 错误代码，参见 AuthErrorCode 枚举 */
  code: string;
  /** 人类可读的错误消息 */
  message: string;
  /** 详细信息（可选） */
  detail?: string;
}

/**
 * 认证状态存储结构（参考）
 * 实际使用见 authStore.ts
 */
export interface AuthState {
  /** 当前登录用户的信息，未认证时为 null */
  currentUser: DesktopUserInfo | null;
  /** 访问令牌，用于 API 请求认证，null 表示未认证 */
  accessToken: string | null;
  /** 当前认证状态，参见 AuthStatus 枚举 */
  authStatus: AuthStatus;
  /** 认证错误详情，用于 UI 展示错误信息 */
  authError: AuthError | null;
}