export type NotifyLevel = "info" | "success" | "warning" | "error";

export interface NotifyItem {
  id: string;
  module: "memo" | "system";
  type: string;
  title: string;
  body: string;
  level: NotifyLevel;
  read: boolean;
  serverId?: number | null;
  sourceId?: number | null;
  externalSourceId?: string | null;
  sourceSystem?: string | null;
  sourceType?: string | null;
  targetUrl?: string | null;
  sourceTitle?: string | null;
  actorName?: string | null;
  preview?: string | null;
  createdAt: string;
}
