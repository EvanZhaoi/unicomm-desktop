import { useEffect, useRef } from "react";
import { notificationManager } from "@/desktop/notification";
import { useNotifyStore } from "../store/notifyStore";

/**
 * 监听通知中心中新到达的 Memo 通知，并转发为操作系统级通知。
 *
 * 组件自身不渲染 UI：Windows 会从屏幕右下角弹出系统通知，macOS 会走系统通知中心。
 */
interface SystemNotificationHostProps {
  onOpenMemo: (memoId: number) => void;
}

export function SystemNotificationHost({ onOpenMemo }: SystemNotificationHostProps) {
  const notifications = useNotifyStore((state) => state.notifications);
  const sentIdsRef = useRef(new Set<string>());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      notifications.forEach((notification) => sentIdsRef.current.add(notification.id));
      initializedRef.current = true;
      return;
    }

    const nextNotification = notifications.find(
      (notification) =>
        notification.module === "memo" &&
        !notification.read &&
        !sentIdsRef.current.has(notification.id)
    );
    if (!nextNotification) {
      return;
    }

    sentIdsRef.current.add(nextNotification.id);
    void notificationManager.notify({
      title: nextNotification.title,
      body: nextNotification.body,
      memoId: nextNotification.sourceId ?? undefined,
      onClick: nextNotification.sourceId ? () => onOpenMemo(nextNotification.sourceId as number) : undefined,
    });
  }, [notifications, onOpenMemo]);

  return null;
}
