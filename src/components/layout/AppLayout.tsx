/**
 * 应用布局组件
 * 
 * 提供 UniComm Desktop 的主布局结构，包括侧边栏、窗口标题栏和主内容区域。
 * 
 * ## 布局结构
 * 
 * ```
 * ┌────────────────────────────────────────────┐
 * │              Custom Titlebar               │
 * ├───────────┬───────────────────────────────│
 * │  Sidebar  │                               │
 * │  (150px)  │        Main Content            │
 * │  Logo     │                               │
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
import { Bell, FileText, Inbox, Minus, Moon, Settings, Share2, Square, Star, Sun, User, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { useMemoStore } from "@/features/memo/store/memoStore";
import type { MemoScope } from "@/features/memo/store/memoStore";
import type { Memo } from "@/features/memo/types/memo.types";
import { MemoGroupIcon } from "@/features/memo/components/MemoGroupIcon";
import { MemoGroupManager } from "@/features/memo/components/MemoGroupManager";
import { useNotifyStore } from "@/features/notify/store/notifyStore";
import { useSettingsStore } from "@/stores/settings.store";
import type { DesktopUserInfo } from "@/features/auth/types/auth.types";

export type AppView = "memo" | "notify" | "settings";

/**
 * 侧边栏组件属性
 */
interface SidebarProps {
  /** 是否折叠侧边栏（折叠时只显示图标） */
  collapsed?: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  currentUser?: DesktopUserInfo | null;
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
export function Sidebar({ collapsed = false, activeView, onViewChange, currentUser }: SidebarProps) {
  const { t } = useI18n();
  const {
    groups,
    activeGroupId,
    activeScope,
    activeStatus,
    isSaving,
    setActiveGroup,
    setActiveScope,
    setActiveStatus,
    fetchMemos,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useMemoStore();
  const unreadNotifyCount = useNotifyStore((state) => state.notifications.filter((item) => !item.read).length);
  const { theme, setTheme } = useSettingsStore();
  const totalMemoCount = groups.reduce((total, group) => total + group.memoCount, 0);

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

  const chooseGroup = async (groupId: number | null) => {
    setActiveGroup(groupId);
    await fetchMemos();
  };

  const chooseScope = async (scope: MemoScope) => {
    setActiveScope(scope);
    onViewChange("memo");
    await fetchMemos();
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card shadow-sm transition-all duration-200 ease-out",
        collapsed ? "w-14" : "w-[170px]"
      )}
    >
      <div className="border-b border-border p-3">
        {!collapsed && (
          <h1 className="text-base font-semibold tracking-normal text-foreground">UniComm</h1>
        )}
        {collapsed && (
          <h1 className="text-center text-sm font-semibold tracking-normal text-foreground">UC</h1>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="rounded-lg border border-border/70 bg-background/60 p-1">
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            label={t("memo.view.all")}
            badge={String(totalMemoCount)}
            collapsed={collapsed}
            active={activeView === "memo" && activeScope === "all"}
            onClick={() => chooseScope("all")}
          />
          <NavItem
            icon={<Share2 className="h-4 w-4" />}
            label={t("memo.view.related")}
            collapsed={collapsed}
            active={activeView === "memo" && activeScope === "related"}
            onClick={() => chooseScope("related")}
          />
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("memo.view.favorite")}
              </div>
              <button
                type="button"
                onClick={() => chooseScope(activeScope === "favorite" ? "all" : "favorite")}
                className={cn(
                  "flex h-7 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  activeScope === "favorite" && "bg-accent font-medium text-foreground"
                )}
              >
                <Star className={cn("h-3.5 w-3.5 shrink-0", activeScope === "favorite" && "fill-primary text-primary")} />
                <span className="min-w-0 flex-1 truncate text-left">{t("memo.view.favorite")}</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("nav.status")}
              </div>
            <div className="mx-1 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value ?? "all"}
                  onClick={() => chooseStatus(filter.value)}
                  className={cn(
                    "h-6 rounded-sm px-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap",
                    activeStatus === filter.value && "bg-primary text-primary-foreground hover:text-primary-foreground"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("memo.groups")}
                </span>
                <MemoGroupManager
                  isSaving={isSaving}
                  onCreate={createGroup}
                  onUpdate={updateGroup}
                  onDelete={deleteGroup}
                />
              </div>
              <div className="max-h-56 space-y-1 overflow-auto pr-1">
                <button
                  type="button"
                  onClick={() => chooseGroup(null)}
                  className={cn(
                    "flex h-7 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    activeGroupId === null && "bg-accent font-medium text-foreground"
                  )}
                >
                  <Inbox className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">{t("memo.all")}</span>
                  <span className="shrink-0 text-[10px]">{totalMemoCount}</span>
                </button>
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={cn(
                      "group flex h-7 w-full items-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      activeGroupId === group.id && "bg-accent font-medium text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => chooseGroup(group.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2"
                      title={group.name}
                    >
                      <MemoGroupIcon group={group} className="h-3.5 w-3.5" />
                      <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                      <span className="shrink-0 text-[10px]">{group.memoCount}</span>
                    </button>
                    <MemoGroupManager
                      group={group}
                      isSaving={isSaving}
                      onCreate={createGroup}
                      onUpdate={updateGroup}
                      onDelete={deleteGroup}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="border-t border-border p-2">
        <div className={cn("mb-2 flex items-center gap-1", collapsed && "flex-col")}>
          <div className={cn("flex rounded-md bg-muted p-0.5", collapsed && "w-9")}>
            <button
              title={t("nav.notify")}
              onClick={() => onViewChange("notify")}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground",
                activeView === "notify" && "bg-card text-foreground shadow-sm"
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifyCount > 0 && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </button>
          </div>
          <div className={cn("flex rounded-md bg-muted p-0.5", collapsed && "w-9")}>
            <button
              title={t("nav.settings")}
              onClick={() => onViewChange("settings")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground",
                activeView === "settings" && "bg-card text-foreground shadow-sm"
              )}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className={cn("flex flex-1 gap-0.5 rounded-md bg-muted p-0.5", collapsed && "w-9 flex-col")}>
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
        </div>
        <div className={cn("mt-2 flex items-center gap-2 rounded-md px-2 py-1.5", collapsed && "justify-center px-0")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {currentUser?.displayName ? (
              <span className="text-xs font-semibold">{currentUser.displayName.slice(0, 1).toUpperCase()}</span>
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-foreground">
                {currentUser?.displayName || currentUser?.username || "-"}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="truncate">{currentUser?.departmentName || t("nav.ready")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
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
        "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground",
        collapsed && "mx-auto w-9 justify-center px-0",
        active && "bg-accent font-medium text-accent-foreground"
      )}
    >
      {icon}
      {!collapsed && <span className="flex-1 text-left text-[13px]">{label}</span>}
      {!collapsed && badge && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{badge}</span>}
    </button>
  );
}

/**
 * 无原生窗口装饰时使用的应用内标题栏。
 *
 * 主窗口在 `tauri.conf.json` 中关闭了系统标题栏，因此这里负责拖拽区域、
 * 最小化、最大化和关闭动作。背景使用 `bg-background`，保持和当前主题一致。
 */
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
    <div className="flex h-8 select-none items-center justify-between border-b border-border bg-background px-3 text-xs text-muted-foreground [-webkit-app-region:drag]">
      <div className="flex items-center gap-2.5">
        <span className="text-primary">●</span>
        <span>UniComm - 企业桌面协作平台</span>
      </div>
      <div className="flex gap-1 [-webkit-app-region:no-drag]">
        <Button variant="ghost" size="icon" onClick={minimizeWindow} className="h-7 w-9">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleMaximizeWindow} className="h-7 w-9">
          <Square className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={closeWindow} className="h-7 w-9 hover:bg-destructive hover:text-destructive-foreground">
          <X className="h-3.5 w-3.5" />
        </Button>
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
  currentUser?: DesktopUserInfo | null;
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
  currentUser,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeView={activeView} onViewChange={onViewChange} currentUser={currentUser} />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
