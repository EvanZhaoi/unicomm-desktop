/**
 * 认证错误视图组件
 * 
 * 显示通用的认证错误信息。当认证过程中发生非预期错误时使用。
 * 与 `AuthStatusView` 的区别：
 * - `AuthStatusView`: 用于已知的状态（checking/rejected/offline）
 * - `AuthErrorView`: 用于处理明确的错误消息
 * 
 * ## 使用示例
 * ```tsx
 * // 在 API 调用失败时显示
 * if (authError) {
 *   return <AuthErrorView message="Token 已过期，请重新登录" />;
 * }
 * 
 * // 不带消息的默认显示
 * return <AuthErrorView />;
 * ```
 * 
 * @component
 * @module features/auth/components
 */

import { useI18n } from "@/i18n/useI18n";

/**
 * AuthErrorView 组件的属性接口
 */
interface AuthErrorViewProps {
  /** 可选的自定义错误消息，若不提供则只显示默认标题 */
  message?: string;
}

/**
 * 认证错误视图组件
 * 
 * 显示认证失败或错误的提示信息。
 * 
 * @param props.message - 可选的错误消息，会显示在标题下方
 * 
 * @example
 * ```tsx
 * // 显示自定义错误消息
 * <AuthErrorView message="会话已过期，请重新登录" />
 * 
 * // 显示默认错误
 * <AuthErrorView />
 * ```
 */
export function AuthErrorView({ message }: AuthErrorViewProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center text-destructive">
        {/* 错误标题 */}
        <p className="text-lg font-medium">{t("auth.failed")}</p>
        {/* 可选的错误详情 */}
        {message && (
          <p className="text-sm mt-2 text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}
