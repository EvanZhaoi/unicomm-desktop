import { client } from "@/core/http";
import type { NotifyLevel } from "../types/notify.types";

export interface NotificationResponse {
  id: number;
  title: string;
  body: string;
  level: NotifyLevel;
  sourceSystem?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  targetUrl?: string | null;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  recipientUsername?: string | null;
  read: boolean;
  readTime?: string | null;
  createTime: string;
}

export interface NotificationCreateInput {
  title: string;
  body: string;
  level?: NotifyLevel;
  sourceSystem?: string;
  sourceType?: string;
  sourceId?: string;
  targetUrl?: string;
  actorDisplayName?: string;
  recipientUsernames: string[];
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/*
 * 通用通知 API 边界。
 *
 * Memo 实时通知仍来自 WebSocket；企业通知平台的历史、已读状态和外部系统通知
 * 通过这些接口和服务端数据库保持一致。
 */
export function listNotifications(params: {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
} = {}): Promise<PageResult<NotificationResponse>> {
  return client.get<PageResult<NotificationResponse>, PageResult<NotificationResponse>>("/notifications", { params });
}

export function createNotification(input: NotificationCreateInput): Promise<NotificationResponse> {
  return client.post<NotificationResponse, NotificationResponse>("/notifications", input);
}

export function markNotificationRead(id: number): Promise<void> {
  return client.patch<void, void>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return client.patch<void, void>("/notifications/read-all");
}
