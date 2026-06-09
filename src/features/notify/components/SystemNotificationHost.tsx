import { useEffect, useRef } from "react";
import { notificationManager } from "@/desktop/notification";
import { useNotifyStore } from "../store/notifyStore";

/**
 * 监听通知中心中新到达的 Memo 通知，并转发为操作系统级通知。
 *
 * 组件自身不渲染 UI：Windows 会从屏幕右下角弹出系统通知，macOS 会走系统通知中心。
 */
export function SystemNotificationHost() {
  const latestNotification = useNotifyStore((state) => state.notifications[0]);
  const sentIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!latestNotification || latestNotification.read || latestNotification.module !== "memo") {
      return;
    }
    if (sentIdsRef.current.has(latestNotification.id)) {
      return;
    }

    sentIdsRef.current.add(latestNotification.id);
    void notificationManager.notify({
      title: latestNotification.title,
      body: latestNotification.body,
    });
  }, [latestNotification]);

  return null;
}
