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
import { FileText, Menu, Settings } from "lucide-react";

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
  return (
    <aside
      className={`flex flex-col border-r border-border bg-card h-full transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo 区域 */}
      <div className="p-4 border-b border-border">
        <h1 className={`font-semibold ${collapsed ? "text-center" : ""}`}>
          {collapsed ? "UC" : "UniComm"}
        </h1>
      </div>
      {/* 导航菜单 */}
      <nav className="flex-1 p-2 space-y-1">
        <NavItem
          icon={<FileText className="h-4 w-4" />}
          label="备忘录"
          collapsed={collapsed}
          active={activeView === "memo"}
          onClick={() => onViewChange("memo")}
        />
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label="设置"
          collapsed={collapsed}
          active={activeView === "settings"}
          onClick={() => onViewChange("settings")}
        />
      </nav>
    </aside>
  );
}

/**
 * 导航项组件属性
 */
interface NavItemProps {
  /** 图标（emoji 格式） */
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
      className={`flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors ${
        collapsed ? "justify-center" : ""
      } ${active ? "bg-accent text-accent-foreground" : ""}`}
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
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      {/* 左侧：菜单切换按钮 */}
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-accent rounded-md transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>
      {/* 右侧：用户信息 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{userName ?? "未登录"}</span>
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
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
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar collapsed={sidebarCollapsed} activeView={activeView} onViewChange={onViewChange} />
      {/* 右侧内容区 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部栏 */}
        <Header onToggleSidebar={onToggleSidebar} />
        {/* 主内容区域 */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
