import { useAuthStore } from "../store/authStore";

export function AuthStatusView() {
  const authStatus = useAuthStore((state) => state.authStatus);

  if (authStatus === "checking") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">正在识别当前 Windows 用户...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "rejected") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">当前 Windows 用户未授权</p>
          <p className="text-sm mt-2">请联系系统管理员获取权限</p>
        </div>
      </div>
    );
  }

  if (authStatus === "offline") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">无法连接认证服务</p>
          <p className="text-sm mt-2">请检查网络连接后重试</p>
        </div>
      </div>
    );
  }

  return null;
}