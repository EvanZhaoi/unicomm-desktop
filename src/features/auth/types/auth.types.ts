/**
 * 认证状态与类型定义
 * 
 * 定义 UniComm Desktop 认证相关的所有类型，包括：
 * - 认证状态枚举（AuthStatus）
 * - 桌面用户信息结构（DesktopUserInfo）
 * - 认证状态存储结构（AuthState）
 * 
 * ## 认证状态机
 * 
 * ```
 *  ┌─────────┐    启动认证    ┌──────────┐
 *  │ "checking" │────────────→│  验证中   │
 *  └─────────┘               └─────┬────┘
 *       ↑                            │
 *       │                  成功/失败  ↓
 *       │                 ┌──────────┴──────────┐
 *       │                 ↓                      ↓
 *       │          ┌────────────┐          ┌─────────┐
 *       └──────────│ "verified" │          │"rejected"│
 *                 └────────────┘          └─────────┘
 *                       │
 *                  网络错误↓
 *                 ┌─────────┐
 *                 │"offline"│
 *                 └─────────┘
 * ```
 * 
 * ## AuthStatus 状态说明
 * - **checking**: 应用启动，正在验证 Windows 用户身份
 * - **verified**: 验证成功，用户已授权，可正常使用应用
 * - **rejected**: 验证失败，用户不在白名单或无权访问
 * - **offline**: 无法连接认证服务器（网络问题或服务宕机）
 * 
 * @module features/auth/types
 */

export type AuthStatus = "checking" | "verified" | "rejected" | "offline";

export interface DesktopUserInfo {
  /** 用户在 UniComm 系统中的唯一 ID */
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

export interface AuthState {
  /** 当前登录用户的信息，未认证时为 null */
  currentUser: DesktopUserInfo | null;
  /** 访问令牌，用于 API 请求认证，null 表示未认证 */
  accessToken: string | null;
  /** 当前认证状态，参见 AuthStatus 枚举 */
  authStatus: AuthStatus;
}