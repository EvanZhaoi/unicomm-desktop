/**
 * 认证状态视图组件
 * 
 * 根据当前的认证状态（authStatus）显示相应的 UI：
 * - **checking**: 显示加载动画和"正在识别当前 Windows 用户..."
 * - **rejected**: 显示红色错误提示"当前 Windows 用户未授权"
 * - **offline**: 显示网络错误提示"无法连接认证服务"
 * - **verified**: 返回 null（正常渲染，由 App.tsx 展示主界面）
 * 
 * ## 使用方式
 * 此组件在 `App.tsx` 中使用，当 `authStatus !== "verified"` 时渲染。
 * 通常与 `AuthErrorView` 配合使用。
 * 
 * ## 使用示例
 * ```tsx
 * // 在受保护路由中
 * if (authStatus !== 'verified') {
 *   return <AuthStatusView />;
 * }
 * ```
 * 
 * @component
 * @module features/auth/components
 */

import { useAuthStore } from "../store/authStore";

/**
 * 认证状态视图组件
 * 
 * 监听 authStore 中的 authStatus，根据状态显示对应的提示信息。
 * 无需接收 props，状态直接从 Zustand store 读取。
 * 
 * 状态映射：
 * - checking → 加载动画
 * - rejected → 授权失败提示
 * - offline → 网络连接失败提示
 * - verified → null（不渲染）
 */
export function AuthStatusView() {
  // 从 authStore 读取当前认证状态
  const authStatus = useAuthStore((state) => state.authStatus);

  // 正在验证中
  if (authStatus === "checking") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          {/* 加载动画 spinner */}
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">正在识别当前 Windows 用户...</p>
        </div>
      </div>
    );
  }

  // 用户未被授权
  if (authStatus === "rejected") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">当前 Windows 用户未授权</p>
          <p className="text-sm mt-2">请联系系统管理员获取权限</p>
        </div>
      </div>
    );
  }

  // 无法连接认证服务器
  if (authStatus === "offline") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">无法连接认证服务</p>
          <p className="text-sm mt-2">请检查网络连接后重试</p>
        </div>
      </div>
    );
  }

  // verified 状态不渲染此组件，由 App.tsx 渲染主界面
  return null;
}