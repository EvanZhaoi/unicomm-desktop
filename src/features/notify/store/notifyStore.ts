import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translate } from "@/i18n";
import { useSettingStore } from "@/stores/settingStore";
import type { RealtimeEvent } from "@/services/realtime";
import type { NotifyItem, NotifyLevel } from "../types/notify.types";

const MAX_NOTIFICATION_COUNT = 200;

interface NotifyState {
  notifications: NotifyItem[];
  addNotification: (notification: Omit<NotifyItem, "id" | "read" | "createdAt"> & Partial<Pick<NotifyItem, "id" | "read" | "createdAt">>) => void;
  addRealtimeEvent: (event: RealtimeEvent) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearRead: () => void;
}

function localized(key: Parameters<typeof translate>[0]): string {
  return translate(key, useSettingStore.getState().language);
}

function describeRealtimeEvent(event: RealtimeEvent): { title: string; body: string; level: NotifyLevel } | null {
  if (event.module !== "memo") {
    return null;
  }

  const memoId = event.memoId ? `#${event.memoId}` : "";
  const memoTitle = event.memoTitle?.trim();
  const titleSuffix = memoTitle ? `：${memoTitle}` : "";
  const actorName = event.actorDisplayName?.trim();
  const preview = event.contentPreview?.trim();
  const details = [
    actorName ? localized("notify.memo.actor").replace("{name}", actorName) : "",
    preview ? localized("notify.memo.preview").replace("{content}", preview) : "",
  ].filter(Boolean);
  const bodyWithDetails = (fallback: string) => (details.length > 0 ? details.join("\n") : fallback.replace("{id}", memoId));

  switch (event.type) {
    case "memo.created":
      return {
        title: `${localized("notify.memo.created.title")}${titleSuffix}`,
        body: bodyWithDetails(localized("notify.memo.created.body")),
        level: "success",
      };
    case "memo.updated":
      return {
        title: `${localized("notify.memo.updated.title")}${titleSuffix}`,
        body: bodyWithDetails(localized("notify.memo.updated.body")),
        level: "info",
      };
    case "memo.deleted":
      return {
        title: `${localized("notify.memo.deleted.title")}${titleSuffix}`,
        body: bodyWithDetails(localized("notify.memo.deleted.body")),
        level: "warning",
      };
    case "memo.related.updated":
      return {
        title: `${localized("notify.memo.shared.title")}${titleSuffix}`,
        body: bodyWithDetails(localized("notify.memo.shared.body")),
        level: "info",
      };
    default:
      if (event.type.startsWith("group.")) {
        return null;
      }
      return {
        title: `${localized("notify.memo.changed.title")}${titleSuffix}`,
        body: bodyWithDetails(localized("notify.memo.changed.body")),
        level: "info",
      };
  }
}

export const useNotifyStore = create<NotifyState>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        const item: NotifyItem = {
          id: notification.id ?? `notify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          module: notification.module,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          level: notification.level,
          read: notification.read ?? false,
          sourceId: notification.sourceId,
          sourceTitle: notification.sourceTitle,
          actorName: notification.actorName,
          preview: notification.preview,
          createdAt: notification.createdAt ?? new Date().toISOString(),
        };

        set((state) => ({
          notifications: [item, ...state.notifications].slice(0, MAX_NOTIFICATION_COUNT),
        }));
      },

      addRealtimeEvent: (event) => {
        const notification = describeRealtimeEvent(event);
        if (!notification) {
          return;
        }

        useNotifyStore.getState().addNotification({
          module: "memo",
          type: event.type,
          title: notification.title,
          body: notification.body,
          level: notification.level,
          sourceId: event.memoId,
          sourceTitle: event.memoTitle,
          actorName: event.actorDisplayName,
          preview: event.contentPreview,
          createdAt: event.occurredAt,
        });
      },

      markRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
        }));
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((item) => ({ ...item, read: true })),
        }));
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== id),
        }));
      },

      clearRead: () => {
        set((state) => ({
          notifications: state.notifications.filter((item) => !item.read),
        }));
      },
    }),
    {
      name: "unicomm-notifications",
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
);
