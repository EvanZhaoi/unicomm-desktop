import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";

export function AppTitlebar() {
  const { t } = useI18n();

  const minimizeWindow = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error("Failed to minimize window", error);
    }
  };

  const toggleMaximizeWindow = async () => {
    try {
      const currentWindow = getCurrentWindow();
      if (await currentWindow.isMaximized()) {
        await currentWindow.unmaximize();
      } else {
        await currentWindow.maximize();
      }
    } catch (error) {
      console.error("Failed to toggle window maximize state", error);
    }
  };

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Failed to close window", error);
    }
  };

  return (
    <div className="flex h-8 select-none items-center justify-between border-b border-border bg-background px-3 text-xs text-muted-foreground [-webkit-app-region:drag]">
      <div className="flex items-center gap-2.5">
        <span className="text-primary">●</span>
        <span>{t("app.title")}</span>
      </div>
      <div className="flex gap-1 [-webkit-app-region:no-drag]">
        <Button variant="ghost" size="icon" onClick={minimizeWindow} className="h-7 w-9" title={t("window.minimize")}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMaximizeWindow}
          className="h-7 w-9"
          title={t("window.maximize")}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeWindow}
          className="h-7 w-9 hover:bg-destructive hover:text-destructive-foreground"
          title={t("window.close")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
