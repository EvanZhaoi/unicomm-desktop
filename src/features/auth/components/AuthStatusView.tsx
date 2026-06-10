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

import { useState } from "react";
import { KeyRound, ShieldAlert, WifiOff } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
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
  const { t } = useI18n();
  // 从 authStore 读取当前认证状态
  const authStatus = useAuthStore((state) => state.authStatus);
  const authError = useAuthStore((state) => state.authError);
  const submitDeviceVerification = useAuthStore((state) => state.submitDeviceVerification);
  const [code, setCode] = useState("");

  // 正在验证中
  if (authStatus === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="rounded-xl border border-border bg-card px-10 py-9 text-center shadow-sm">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          <p className="text-base font-medium text-foreground">{t("auth.checking")}</p>
          <p className="mt-2 text-sm text-muted-foreground">即将进入 UniComm 工作空间</p>
        </div>
      </div>
    );
  }

  // 用户未被授权
  if (authStatus === "rejected") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="rounded-xl border border-border bg-card px-10 py-9 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="text-base font-medium text-destructive">{t("auth.rejected.title")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.rejected.description")}</p>
        </div>
      </div>
    );
  }

  if (authStatus === "device_verification") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card px-10 py-9 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <p className="text-base font-medium text-foreground">需要确认当前设备</p>
          <p className="mt-2 text-sm text-muted-foreground">
            验证码已发送到你的企业邮箱。测试阶段请查看后端日志中的验证码。
          </p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-5 h-9 w-full rounded-md border border-input bg-background px-3 text-center text-sm tracking-[0.35em] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="输入 6 位验证码"
            inputMode="numeric"
          />
          {authError?.message && (
            <p className="mt-2 text-xs text-destructive">{authError.message}</p>
          )}
          <button
            type="button"
            disabled={code.length !== 6}
            onClick={() => void submitDeviceVerification(code)}
            className="mt-4 h-9 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            验证并进入
          </button>
        </div>
      </div>
    );
  }

  // 无法连接认证服务器
  if (authStatus === "offline") {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="rounded-xl border border-border bg-card px-10 py-9 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <WifiOff className="h-5 w-5" />
          </div>
          <p className="text-base font-medium text-foreground">{t("auth.offline.title")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.offline.description")}</p>
        </div>
      </div>
    );
  }

  // verified 状态不渲染此组件，由 App.tsx 渲染主界面
  return null;
}
