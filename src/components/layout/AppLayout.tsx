/**
 * 应用布局组件
 * 
 * 提供 UniComm Desktop 的主布局结构，包括侧边栏、窗口标题栏和主内容区域。
 * 
 * ## 布局结构
 * 
 * ```
 * ┌────────────────────────────────────────────┐
 * │  Sidebar  │         Header                  │
 * │  (w-64)   ├───────────────────────────────│
 * │           │                               │
 * │  Logo     │        Main Content            │
 * │  ────     │                               │
 * │  📝 备忘录 │                               │
 * │  ⚙️ 设置  │                               │
 * │           │                               │
 * └───────────┴───────────────────────────────┘
 * ```
 * 
 * ## 使用示例
 * ```tsx
 * <AppLayout sidebarCollapsed={isCollapsed}>
 *   <YourContent />
 * </AppLayout>
 * ```
 * 
 * @module components/layout
 */

import type { ReactNode } from "react";
import { FileText, Minus, Moon, Settings, Square, Sun, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { useMemoStore } from "@/features/memo/store/memoStore";
import type { Memo } from "@/features/memo/types/memo.types";
import { useSettingsStore } from "@/stores/settings.store";

export type AppView = "memo" | "settings";

/**
 * 侧边栏组件属性
 */
interface SidebarProps {
  /** 是否折叠侧边栏（折叠时只显示图标） */
  collapsed?: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

/**
 * 侧边栏组件
 * 
 * 应用的主要导航入口，包含：
 * - Logo/应用名称
 * - 导航菜单项
 * 
 * @param props.collapsed - true 时侧边栏宽度变为 64px，仅显示图标
 */
export function Sidebar({ collapsed = false, activeView, onViewChange }: SidebarProps) {
  const { t } = useI18n();
  const { memos, activeStatus, setActiveStatus, fetchMemos } = useMemoStore();
  const { theme, setTheme } = useSettingsStore();

  const statusFilters: Array<{ label: string; value: Memo["status"] | null }> = [
    { label: t("memo.all"), value: null },
    { label: t("memo.status.normal"), value: "normal" },
    { label: t("memo.status.todo"), value: "todo" },
    { label: t("memo.status.done"), value: "done" },
  ];

  const chooseStatus = async (status: Memo["status"] | null) => {
    setActiveStatus(status);
    await fetchMemos();
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card shadow-sm transition-all duration-200 ease-out",
        collapsed ? "w-16" : "w-[220px]"
      )}
    >
      <div className="border-b border-border p-4">
        {!collapsed && (
          <h1 className="text-base font-semibold tracking-normal text-foreground">UniComm</h1>
        )}
        {collapsed && (
          <h1 className="text-center text-sm font-semibold tracking-normal text-foreground">UC</h1>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-6">
          {!collapsed && <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("nav.shortcuts")}</div>}
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            label={t("nav.memo")}
            badge={String(memos.length)}
            collapsed={collapsed}
            active={activeView === "memo"}
            onClick={() => onViewChange("memo")}
          />
        </div>
        <div className="mb-6">
          {!collapsed && <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("nav.status")}</div>}
          {!collapsed && (
            <div className="mx-1 flex gap-1 rounded-md bg-muted p-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value ?? "all"}
                  onClick={() => chooseStatus(filter.value)}
                  className={cn(
                    "flex-1 rounded-sm px-1 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground",
                    activeStatus === filter.value && "bg-primary text-primary-foreground hover:text-primary-foreground"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {!collapsed && <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("nav.settings")}</div>}
          <NavItem
            icon={<Settings className="h-4 w-4" />}
            label={t("nav.settings")}
            collapsed={collapsed}
            active={activeView === "settings"}
            onClick={() => onViewChange("settings")}
          />
        </div>
      </nav>
      {!collapsed && (
        <div className="border-t border-border p-4">
          <div className="mb-2 flex gap-0.5 rounded-md bg-muted p-0.5">
            <button
              title="Light"
              onClick={() => setTheme("light")}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground",
                theme === "light" && "bg-card text-foreground shadow-sm"
              )}
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              title="Dark"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground",
                theme === "dark" && "bg-card text-foreground shadow-sm"
              )}
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{t("nav.ready")}</span>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * 导航项组件属性
 */
interface NavItemProps {
  /** 图标 */
  icon: ReactNode;
  /** 导航标签文字 */
  label: string;
  badge?: string;
  /** 是否折叠（不显示文字） */
  collapsed?: boolean;
  active?: boolean;
  onClick?: () => void;
}

/**
 * 导航项组件
 * 
 * 侧边栏内的单个菜单项。
 * 
 * @param props.icon - 菜单图标
 * @param props.label - 菜单文字
 * @param props.collapsed - true 时只显示图标
 */
function NavItem({
  icon,
  label,
  badge,
  collapsed,
  active,
  onClick,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground",
        collapsed && "mx-auto w-10 justify-center px-0",
        active && "bg-accent font-medium text-accent-foreground"
      )}
    >
      {icon}
      {!collapsed && <span className="flex-1 text-left text-[13px]">{label}</span>}
      {!collapsed && badge && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{badge}</span>}
    </button>
  );
}

function Titlebar() {
  const minimizeWindow = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error("Failed to minimize window", error);
    }
  };

  const toggleMaximizeWindow = async () => {
    try {
      const currentWindow = getCurrentWindow();
      if (await currentWindow.isMaximized()) {
        await currentWindow.unmaximize();
      } else {
        await currentWindow.maximize();
      }
    } catch (error) {
      console.error("Failed to toggle window maximize state", error);
    }
  };

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Failed to close window", error);
    }
  };

  return (
    <div className="flex h-9 select-none items-center justify-between border-b border-border bg-background px-2 text-xs text-muted-foreground [-webkit-app-region:drag]">
      <div className="flex items-center gap-2">
        <span className="text-primary">●</span>
        <span>UniComm - 企业桌面协作平台</span>
      </div>
      <div className="flex [-webkit-app-region:no-drag]">
        <button onClick={minimizeWindow} className="flex h-8 w-11 items-center justify-center rounded-sm transition-colors hover:bg-accent hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
        <button onClick={toggleMaximizeWindow} className="flex h-8 w-11 items-center justify-center rounded-sm transition-colors hover:bg-accent hover:text-foreground"><Square className="h-3 w-3" /></button>
        <button onClick={closeWindow} className="flex h-8 w-11 items-center justify-center rounded-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

/**
 * 应用布局组件属性
 */
interface AppLayoutProps {
  /** 子组件（主内容区域） */
  children: ReactNode;
  /** 是否折叠侧边栏 */
  sidebarCollapsed?: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

/**
 * 应用布局组件
 * 
 * 统一的布局容器，包含侧边栏、顶部栏和主内容区域。
 * 
 * @param props.children - 主内容区域的子组件
 * @param props.sidebarCollapsed - 侧边栏是否折叠
 */
export function AppLayout({
  children,
  sidebarCollapsed,
  activeView,
  onViewChange,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeView={activeView} onViewChange={onViewChange} />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
