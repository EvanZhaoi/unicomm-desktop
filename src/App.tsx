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
 *         ├── 自定义窗口标题栏
 *         └── main content
 *             ├── MemoWorkspace
 *             └── SettingsPanel
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
 * 若 Tauri 后端不可用，认证流程会停留在对应错误状态。
 * 桌面能力统一由 `src/desktop/*` 封装，避免业务组件直接依赖 Rust 命令细节。
 * 
 * @module App
 */

import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
// 认证状态管理
import { useAuthStore } from "./features/auth/store/authStore";

// 布局组件
import { AppLayout, type AppView } from "./components/layout";
// 认证状态视图（未认证时显示）
import { AuthStatusView } from "./features/auth/components/AuthStatusView";
import { MemoWorkspace } from "./features/memo/components/MemoWorkspace";
import { QuickMemoWindow } from "./features/memo/components/QuickMemoWindow";
import { SettingsPanel } from "./features/settings/components/SettingsPanel";
import { NotificationCenter } from "./features/notify/components/NotificationCenter";
import { SystemNotificationHost } from "./features/notify/components/SystemNotificationHost";
import { notificationManager } from "./desktop/notification";
import { saveMemoDraftBeforeLeave } from "./features/memo/services/memoDraftGuard";
import { configureGlobalShortcuts } from "./desktop/shortcut/shortcutManager";
import { useSettingStore } from "./stores/settingStore";
import { useI18n } from "./i18n/useI18n";
import { realtimeService } from "./services/realtime";
import { invalidateMemoQueriesForRealtimeEvent } from "./features/memo/api/memoQueryInvalidation";
import { useMemoStore } from "./features/memo/store/memoStore";
import { useNotifyStore } from "./features/notify/store/notifyStore";

/**
 * 应用内容组件
 * 
 * 包含所有业务逻辑的子组件。
 * 需要使用 hooks（如 useAuthStore、useEffect），所以单独拆分。
 */
function AppContent() {
  // 从 authStore 获取认证相关状态和方法
  const { currentUser, authStatus, initAuth } = useAuthStore();
  
  const { shortcuts, language, themeMode, sidebarCollapsed } = useSettingStore();
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<AppView>("memo");
  const [isQuickMemoWindow] = useState(() => {
    try {
      return getCurrentWindow().label === "quick-memo";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const preventNativeContextMenu = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("contextmenu", preventNativeContextMenu);
    return () => {
      window.removeEventListener("contextmenu", preventNativeContextMenu);
    };
  }, []);

  const openMemoFromNotification = useCallback(async (memoId: number) => {
    if (!(await saveMemoDraftBeforeLeave())) {
      return;
    }

    const mainWindow = getCurrentWindow();
    void mainWindow.show().then(() => mainWindow.unminimize()).then(() => mainWindow.setFocus());
    setActiveView("memo");
    void useMemoStore.getState().focusMemo(memoId);
  }, []);

  useEffect(() => {
    if (isQuickMemoWindow) {
      return;
    }

    let unlisten: (() => void) | null = null;

    void listen<number>("open-memo-from-notification", ({ payload: memoId }) => {
      notificationManager.consumePendingMemoId();
      void openMemoFromNotification(memoId);
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, [isQuickMemoWindow, openMemoFromNotification]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    void getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        return;
      }

      const memoId = notificationManager.consumePendingMemoId();
      if (memoId) {
        void openMemoFromNotification(memoId);
      }
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, [openMemoFromNotification]);

  /**
   * 初始化认证流程
   * 
   * 组件挂载时执行一次，完成以下步骤：
   * 1. 尝试恢复已保存的 Session
   * 2. 没有有效 Session 时，执行完整桌面认证流程
   */
  useEffect(() => {
    if (!isQuickMemoWindow) {
      initAuth();
      return;
    }

    let unlisten: (() => void) | null = null;
    const currentWindow = getCurrentWindow();

    void currentWindow.isVisible().then((visible) => {
      if (visible) {
        initAuth();
      }
    });

    void currentWindow.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        initAuth();
      }
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, [initAuth, isQuickMemoWindow]);

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
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDarkTheme = themeMode === "dark" || (themeMode === "system" && mediaQuery.matches);
      document.documentElement.classList.toggle("dark", useDarkTheme);
    };

    applyTheme();
    if (themeMode !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    if (authStatus !== "verified") {
      realtimeService.disconnect();
      return;
    }

    /*
     * 实时同步策略：
     * - WebSocket 事件只表示“某个 Memo/分组发生变化”，不直接把事件体当作最终数据。
     * - 事件会进入 250ms 防抖窗口，合并短时间内的多次保存/相关人变更，避免界面闪烁和接口连发。
     * - 自己触发的事件只刷新本地列表，不进入通知中心；其他人的更新才生成桌面通知。
     * - 收到事件后必须先失效 TanStack Query 缓存，否则 fetchQuery 可能返回 staleTime 内的旧数据。
     */
    let refreshTimer: number | null = null;
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.module !== "memo") {
        return;
      }
      if (
        currentUser?.username &&
        event.recipientUsernames?.length &&
        !event.recipientUsernames.includes(currentUser.username)
      ) {
        return;
      }

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      // 自己发起的变更只需要刷新本地数据，不进入通知中心。
      if (!currentUser?.username || event.ownerUsername !== currentUser.username) {
        useNotifyStore.getState().addRealtimeEvent(event);
      }

      refreshTimer = window.setTimeout(() => {
        const memoStore = useMemoStore.getState();
        invalidateMemoQueriesForRealtimeEvent(event.type, event.memoId ?? null);
        if (event.type.startsWith("group.")) {
          void memoStore.fetchGroups();
        }
        if (event.type.startsWith("memo.")) {
          void memoStore.fetchMemos();
        }
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
  }, [authStatus, currentUser?.username]);

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
 * - AppLayout 布局容器：包含无原生装饰窗口下的自定义标题栏和侧边栏
 * - MemoWorkspace：主 Memo 工作区
 * - SettingsPanel：语言、字体和快捷键设置
 */
  return (
    <>
      <AppLayout
        sidebarCollapsed={sidebarCollapsed}
        activeView={activeView}
        onViewChange={setActiveView}
        currentUser={currentUser}
      >
        {activeView === "memo" && <MemoWorkspace />}
        {activeView === "notify" && <NotificationCenter onOpenMemo={openMemoFromNotification} />}
        {activeView === "settings" && <SettingsPanel />}
      </AppLayout>
      <SystemNotificationHost onOpenMemo={openMemoFromNotification} />
    </>
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
