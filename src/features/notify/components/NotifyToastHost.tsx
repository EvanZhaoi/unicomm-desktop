import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useNotifyStore } from "../store/notifyStore";
import type { NotifyItem } from "../types/notify.types";

const TOAST_LIFETIME_MS = 6500;
const MAX_VISIBLE_TOASTS = 3;

const levelClassName: Record<NotifyItem["level"], string> = {
  info: "border-primary/35 bg-primary/5 text-primary",
  success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-600",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function NotifyToastHost() {
  const latestNotification = useNotifyStore((state) => state.notifications[0]);
  const [visibleToasts, setVisibleToasts] = useState<NotifyItem[]>([]);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!latestNotification || latestNotification.read || latestNotification.module !== "memo") {
      return;
    }
    if (seenIdsRef.current.has(latestNotification.id)) {
      return;
    }

    seenIdsRef.current.add(latestNotification.id);
    setVisibleToasts((items) => [latestNotification, ...items.filter((item) => item.id !== latestNotification.id)].slice(0, MAX_VISIBLE_TOASTS));

    const timer = window.setTimeout(() => {
      setVisibleToasts((items) => items.filter((item) => item.id !== latestNotification.id));
    }, TOAST_LIFETIME_MS);

    return () => window.clearTimeout(timer);
  }, [latestNotification]);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {visibleToasts.map((item) => (
        <article
          key={item.id}
          className="pointer-events-auto overflow-hidden rounded-lg border border-border bg-popover shadow-lg ring-1 ring-black/5"
        >
          <div className="flex items-start gap-3 p-3">
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", levelClassName[item.level])}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-popover-foreground">{item.title}</h3>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-5 text-muted-foreground">{item.body}</p>
            </div>
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
              onClick={() => setVisibleToasts((items) => items.filter((toast) => toast.id !== item.id))}
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
