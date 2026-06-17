import { Eye, Pencil } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { Memo } from "../types/memo.types";

interface MemoPermissionBadgeProps {
  permission: Memo["currentUserPermission"];
  compact?: boolean;
}

export function MemoPermissionBadge({ permission, compact = false }: MemoPermissionBadgeProps) {
  const { t } = useI18n();
  const normalized = permission === "owner" || permission === "edit" ? permission : "view";
  const label =
    normalized === "owner"
      ? t(compact ? "memo.permission.ownerShort" : "memo.permission.owner")
      : normalized === "edit"
        ? t(compact ? "memo.permission.editShort" : "memo.permission.edit")
        : t(compact ? "memo.permission.viewShort" : "memo.permission.view");
  const title =
    normalized === "owner"
      ? t("memo.permission.manageHint")
      : normalized === "edit"
        ? t("memo.permission.editHint")
        : t("memo.permission.viewHint");

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        normalized === "owner" && "border-primary/30 bg-primary/10 text-primary",
        normalized === "edit" && "border-blue-500/30 bg-blue-500/10 text-blue-600",
        normalized === "view" && "border-border bg-muted text-muted-foreground"
      )}
      title={title}
    >
      {normalized === "edit" ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
