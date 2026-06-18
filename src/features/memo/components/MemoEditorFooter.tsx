import { Pin, Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { Memo } from "../types/memo.types";
import { MemoSaveStatusIndicator, type DraftSaveStatus } from "./MemoSaveStatusIndicator";

interface MemoEditorFooterProps {
  memo: Memo;
  saveStatus: DraftSaveStatus;
  error: string | null;
  canEdit: boolean;
  canManage: boolean;
  isSaving: boolean;
  isDraftDirty: boolean;
  onToggleTop: () => void;
  onToggleFavorite: () => void;
  onSave: () => void;
  onDelete: () => void;
}

/**
 * Presents editor persistence state and Memo commands.
 * The parent keeps command sequencing, such as saving a draft before toggling
 * top or favorite state, while this component owns footer layout and labels.
 */
export function MemoEditorFooter({
  memo,
  saveStatus,
  error,
  canEdit,
  canManage,
  isSaving,
  isDraftDirty,
  onToggleTop,
  onToggleFavorite,
  onSave,
  onDelete,
}: MemoEditorFooterProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-3">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <MemoSaveStatusIndicator status={saveStatus} />
        {error && <span className="text-destructive">{error}</span>}
        {!canEdit && <span>{t("memo.permission.viewHint")}</span>}
        {canEdit && !canManage && <span>{t("memo.permission.editHint")}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleTop} disabled={isSaving}>
          <Pin className={cn(memo.isTop && "fill-primary text-primary")} />
          {memo.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleFavorite} disabled={isSaving}>
          <Star className={cn(memo.isFavorite && "fill-primary text-primary")} />
          {t("memo.action.favorite")}
        </Button>
        {canEdit && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || saveStatus === "saving" || !isDraftDirty}
          >
            <Save />
            {t("memo.action.save")}
          </Button>
        )}
        {canManage && (
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={isSaving}>
            <Trash2 />
            {t("memo.action.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
