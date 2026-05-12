import type { ReactNode } from "react";

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col border-r border-border bg-card h-full transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 border-b border-border">
        <h1 className={`font-semibold ${collapsed ? "text-center" : ""}`}>
          {collapsed ? "UC" : "UniComm"}
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        <NavItem icon="📝" label="备忘录" collapsed={collapsed} />
        <NavItem icon="⚙️" label="设置" collapsed={collapsed} />
      </nav>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  collapsed,
}: {
  icon: string;
  label: string;
  collapsed?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <span>{icon}</span>
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  );
}

interface HeaderProps {
  userName?: string;
  onToggleSidebar?: () => void;
}

export function Header({ userName, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-accent rounded-md transition-colors"
      >
        ☰
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{userName ?? "未登录"}</span>
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
          {userName?.charAt(0) ?? "?"}
        </div>
      </div>
    </header>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function AppLayout({ children, sidebarCollapsed, onToggleSidebar }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onToggleSidebar={onToggleSidebar} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}