/**
 * 应用布局组件
 * 
 * 提供 UniComm Desktop 的主布局结构，包括：
 * - 侧边栏 (Sidebar)
 * - 顶部栏 (Header)
 * - 主内容区域 (main)
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
 * <AppLayout
 *   sidebarCollapsed={isCollapsed}
 *   onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
 * >
 *   <YourContent />
 * </AppLayout>
 * ```
 * 
 * @module components/layout
 */

import type { ReactNode } from "react";
import { FileText, Menu, Settings, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";

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

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card shadow-sm transition-all duration-200 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-normal text-foreground">UniComm</h1>
            <p className="truncate text-[11px] text-muted-foreground">{t("nav.workspace")}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        <NavItem
          icon={<FileText className="h-4 w-4" />}
          label={t("nav.memo")}
          collapsed={collapsed}
          active={activeView === "memo"}
          onClick={() => onViewChange("memo")}
        />
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label={t("nav.settings")}
          collapsed={collapsed}
          active={activeView === "settings"}
          onClick={() => onViewChange("settings")}
        />
      </nav>
      {!collapsed && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
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
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  );
}

/**
 * 顶部栏组件属性
 */
interface HeaderProps {
  /** 当前用户名（显示在右侧） */
  userName?: string;
  /** 切换侧边栏的回调函数 */
  onToggleSidebar?: () => void;
}

/**
 * 顶部栏组件
 * 
 * 显示在布局顶部，包含：
 * - 左侧：菜单切换按钮
 * - 右侧：用户头像和名称
 * 
 * @param props.userName - 当前用户名，用于显示在右侧
 * @param props.onToggleSidebar - 点击左侧按钮时的回调
 */
export function Header({ userName, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <button
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{userName ?? "未登录"}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm">
          {userName?.charAt(0) ?? "?"}
        </div>
      </div>
    </header>
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
  /** 切换侧边栏的回调 */
  onToggleSidebar?: () => void;
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
 * @param props.onToggleSidebar - 切换侧边栏的回调
 */
export function AppLayout({
  children,
  sidebarCollapsed,
  onToggleSidebar,
  activeView,
  onViewChange,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} activeView={activeView} onViewChange={onViewChange} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={onToggleSidebar} />
        <main className="min-h-0 flex-1 overflow-hidden p-4">{children}</main>
      </div>
    </div>
  );
}
