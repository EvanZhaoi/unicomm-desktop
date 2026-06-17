import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";

export type DraftSaveStatus = "saved" | "dirty" | "saving" | "error";

interface MemoSaveStatusIndicatorProps {
  status: DraftSaveStatus;
}

/**
 * Shows the current local draft persistence state.
 * Keeping this outside MemoWorkspace prevents the editor shell from owning
 * presentation details for every footer status.
 */
export function MemoSaveStatusIndicator({ status }: MemoSaveStatusIndicatorProps) {
  const { t } = useI18n();
  const config = {
    saved: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: t("memo.editor.saved"),
      className: "text-emerald-600",
    },
    dirty: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: t("memo.editor.unsaved"),
      className: "text-yellow-600",
    },
    saving: {
      icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
      label: t("memo.editor.saving"),
      className: "text-primary",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: t("memo.editor.saveFailed"),
      className: "text-destructive",
    },
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", config.className)}>
      {config.icon}
      {config.label}
    </span>
  );
}
