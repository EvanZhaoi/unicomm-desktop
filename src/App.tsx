import { useEffect } from "react";
import { useAuthStore } from "./stores/auth.store";
import { useSettingsStore } from "./stores/settings.store";
import { getDeviceInfo } from "./desktop/device";
import { AppLayout } from "./components/layout";
import { AuthStatusView } from "./features/auth/components/AuthStatusView";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui";
import { getCurrentWindowsUser } from "./desktop/user";

function AppContent() {
  const { currentUser, authStatus, verifyDesktopUser } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();

  useEffect(() => {
    const init = async () => {
      try {
        const deviceInfo = await getDeviceInfo();
        const userInfo = await getCurrentWindowsUser();
        await verifyDesktopUser({
          deviceId: deviceInfo.deviceId,
          username: userInfo.username,
          computerName: deviceInfo.computerName,
          os: deviceInfo.os,
        });
      } catch {
        // Tauri not available, use mock
        await verifyDesktopUser({});
      }
    };
    init();
  }, [verifyDesktopUser]);

  if (authStatus !== "verified" || !currentUser) {
    return <AuthStatusView />;
  }

  return (
    <AppLayout sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">欢迎回来，{currentUser.displayName}</h2>
          <p className="text-muted-foreground">
            {currentUser.departmentName} · {currentUser.employeeNo}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              备忘录功能开发中...
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function App() {
  return <AppContent />;
}