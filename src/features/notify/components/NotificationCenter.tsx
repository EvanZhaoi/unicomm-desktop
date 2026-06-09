import { useMemo, useState } from "react";
import { Bell, CheckCheck, Circle, Clock3, FlaskConical, Trash2 } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { notificationManager } from "@/desktop/notification";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { useNotifyStore } from "../store/notifyStore";
import type { NotifyItem } from "../types/notify.types";

type NotifyFilter = "all" | "unread";

function formatNotifyTime(value: string): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function levelClassName(level: NotifyItem["level"]): string {
  switch (level) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-yellow-500";
    case "error":
      return "bg-destructive";
    default:
      return "bg-primary";
  }
}

export function NotificationCenter() {
  const { t } = useI18n();
  const { notifications, markRead, markAllRead, removeNotification, clearRead } = useNotifyStore();
  const [filter, setFilter] = useState<NotifyFilter>("all");
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => (filter === "unread" ? !item.read : true)),
    [filter, notifications]
  );
  const sendTestSystemNotification = () => {
    void notificationManager.notify({
      title: t("notify.test.title"),
      body: `${t("notify.memo.actor", { name: t("notify.test.actor") })}\n${t("notify.memo.preview", {
        content: t("notify.test.preview"),
      })}`,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">{t("notify.title")}</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("notify.description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={sendTestSystemNotification}>
              <FlaskConical className="h-3.5 w-3.5" />
              {t("notify.action.test")}
            </Button>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notify.action.markAllRead")}
            </Button>
            <Button variant="outline" size="sm" onClick={clearRead} disabled={notifications.every((item) => !item.read)}>
              <Trash2 className="h-3.5 w-3.5" />
              {t("notify.action.clearRead")}
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as NotifyFilter)} className="mt-3">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="h-7 px-3 text-xs">
              {t("notify.filter.all")}
            </TabsTrigger>
            <TabsTrigger value="unread" className="h-7 px-3 text-xs">
              {t("notify.filter.unread")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {visibleNotifications.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium text-foreground">{t("notify.empty.title")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("notify.empty.description")}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleNotifications.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "flex gap-3 rounded-md border border-border bg-card p-3 shadow-sm transition-colors",
                  !item.read && "border-primary/30 bg-primary/5"
                )}
              >
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", levelClassName(item.level))} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium text-foreground">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                    </div>
                    {!item.read && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-primary">
                        <Circle className="h-2 w-2 fill-current" />
                        {t("notify.unread")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {formatNotifyTime(item.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {!item.read && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markRead(item.id)}>
                          {t("notify.action.markRead")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeNotification(item.id)}
                        title={t("notify.action.remove")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
