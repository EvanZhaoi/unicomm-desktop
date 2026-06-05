import { create } from "zustand";
import { translate } from "@/i18n";
import { useSettingStore } from "@/stores/settingStore";
import type { RealtimeEvent } from "@/services/realtime";
import type { NotifyItem, NotifyLevel } from "../types/notify.types";

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

  switch (event.type) {
    case "memo.created":
      return {
        title: localized("notify.memo.created.title"),
        body: localized("notify.memo.created.body").replace("{id}", memoId),
        level: "success",
      };
    case "memo.updated":
      return {
        title: localized("notify.memo.updated.title"),
        body: localized("notify.memo.updated.body").replace("{id}", memoId),
        level: "info",
      };
    case "memo.deleted":
      return {
        title: localized("notify.memo.deleted.title"),
        body: localized("notify.memo.deleted.body").replace("{id}", memoId),
        level: "warning",
      };
    case "memo.related.updated":
      return {
        title: localized("notify.memo.shared.title"),
        body: localized("notify.memo.shared.body").replace("{id}", memoId),
        level: "info",
      };
    default:
      if (event.type.startsWith("group.")) {
        return null;
      }
      return {
        title: localized("notify.memo.changed.title"),
        body: localized("notify.memo.changed.body").replace("{id}", memoId),
        level: "info",
      };
  }
}

export const useNotifyStore = create<NotifyState>((set) => ({
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
      createdAt: notification.createdAt ?? new Date().toISOString(),
    };

    set((state) => ({
      notifications: [item, ...state.notifications].slice(0, 100),
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
}));
