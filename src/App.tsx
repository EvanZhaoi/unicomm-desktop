/**
 * 应用根组件
 * 
 * UniComm Desktop 应用的根组件，负责：
 * 1. **初始化认证**: 启动时调用 `initAuth()` 恢复或验证用户身份
 * 2. **权限控制**: 根据认证状态决定显示内容
 * 3. **渲染主界面**: 认证成功后显示应用主界面
 * 
 * ## 组件结构
 * 
 * ```
 * App
 * └── AppContent (子组件，用于使用 hooks)
 *     ├── 未认证 → AuthStatusView（显示认证状态/错误）
 *     └── 已认证 → AppLayout
 *         ├── Sidebar
 *         ├── Header
 *         └── main content
 *             └── 欢迎卡片
 * ```
 * 
 * ## 初始化流程
 * 
 * 1. **组件挂载** (useEffect)
 * 2. **恢复本地 Session**
 * 3. **无有效 Session 时获取设备和 Windows 用户信息**
 * 4. **调用认证接口** → `verifyDesktopUser()`
 * 5. **更新认证状态** (authStore)
 *    - 成功 → `authStatus = "verified"`，渲染主界面
 *    - 失败 → `authStatus = "rejected/offline"`，显示错误
 * 
 * ## 降级策略
 * 
 * 若 Tauri 后端不可用（开发环境无 Tauri 支持）：
 * - `getDeviceInfo()` / `getCurrentWindowsUser()` 抛出异常
 * - `catch` 块捕获异常，使用空对象调用 `verifyDesktopUser({})`
 * - 模拟认证流程继续（mock-token）
 * 
 * @module App
 */

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
// 认证状态管理
import { useAuthStore } from "./features/auth/store/authStore";
// 应用设置（侧边栏折叠状态）
import { useSettingsStore } from "./stores/settings.store";

// 布局组件
import { AppLayout } from "./components/layout";
// 认证状态视图（未认证时显示）
import { AuthStatusView } from "./features/auth/components/AuthStatusView";
import { MemoWorkspace } from "./features/memo/components/MemoWorkspace";
import { QuickMemoWindow } from "./features/memo/components/QuickMemoWindow";
import { SettingsPanel } from "./features/settings/components/SettingsPanel";
import { configureGlobalShortcuts } from "./desktop/shortcut/shortcutManager";
import { useSettingStore } from "./stores/settingStore";
import { useI18n } from "./i18n/useI18n";
import { realtimeService } from "./services/realtime";
import { useMemoStore } from "./features/memo/store/memoStore";

/**
 * 应用内容组件
 * 
 * 包含所有业务逻辑的子组件。
 * 需要使用 hooks（如 useAuthStore、useEffect），所以单独拆分。
 */
function AppContent() {
  // 从 authStore 获取认证相关状态和方法
  const { currentUser, authStatus, initAuth } = useAuthStore();
  
  // 从 settingsStore 获取侧边栏状态和方法
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const { shortcuts, language } = useSettingStore();
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<"memo" | "settings">("memo");
  const [isQuickMemoWindow] = useState(() => {
    try {
      return getCurrentWindow().label === "quick-memo";
    } catch {
      return false;
    }
  });

  /**
   * 初始化认证流程
   * 
   * 组件挂载时执行一次，完成以下步骤：
   * 1. 尝试恢复已保存的 Session
   * 2. 没有有效 Session 时，执行完整桌面认证流程
   */
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    configureGlobalShortcuts(shortcuts).catch((error) => {
      console.error("Failed to configure global shortcuts", error);
    });
  }, [shortcuts]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  useEffect(() => {
    if (authStatus !== "verified") {
      realtimeService.disconnect();
      return;
    }

    let refreshTimer: number | null = null;
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.module !== "memo") {
        return;
      }

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        useMemoStore.getState().fetchInitialData();
        refreshTimer = null;
      }, 250);
    });

    realtimeService.connect();

    return () => {
      unsubscribe();
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
    };
  }, [authStatus]);

  if (isQuickMemoWindow) {
    if (authStatus !== "verified" || !currentUser) {
      return (
        <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          {t("app.initializing")}
        </div>
      );
    }
    return <QuickMemoWindow />;
  }

  /**
   * 权限控制
   * 
   * 根据认证状态决定渲染内容：
   * - `checking` → AuthStatusView 显示加载状态
   * - `rejected` → AuthStatusView 显示错误信息
   * - `offline` → AuthStatusView 显示网络错误
   * - `verified` 且有 currentUser → 渲染主界面
   */
  if (authStatus !== "verified" || !currentUser) {
    return <AuthStatusView />;
  }

  /**
   * 认证成功：渲染主界面
   * 
   * 包含：
   * - AppLayout 布局容器
   * - 欢迎信息卡片
   * - 快捷操作入口（备忘录功能开发中）
   */
  return (
    <AppLayout
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar}
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {activeView === "memo" ? <MemoWorkspace /> : <SettingsPanel />}
    </AppLayout>
  );
}

/**
 * 应用根组件
 * 
 * 导出 AppContent 组件作为默认导出。
 * 无需接收任何 props，认证流程在内部自动触发。
 */
export default function App() {
  return <AppContent />;
}
