import { Columns2, FileCode2, FileText, Users } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { Memo, MemoGroup } from "../types/memo.types";
import { formatMemoDate, memoStatusKey } from "../utils/memoFormatters";
import { MemoGroupIcon } from "./MemoGroupIcon";
import { MemoPermissionBadge } from "./MemoPermissionBadge";

export type MemoEditorMode = "visual" | "markdown" | "split";

const memoStatusOptions: Array<{ value: Memo["status"]; colorClassName: string }> = [
  { value: "normal", colorClassName: "bg-emerald-500" },
  { value: "todo", colorClassName: "bg-yellow-500" },
  { value: "done", colorClassName: "bg-blue-500" },
];

interface MemoEditorHeaderProps {
  draft: Memo;
  groups: MemoGroup[];
  editorMode: MemoEditorMode;
  currentPermission: Memo["currentUserPermission"];
  canEdit: boolean;
  canManage: boolean;
  onTitleChange: (title: string) => void;
  onGroupChange: (groupId: number) => void;
  onStatusChange: (status: Memo["status"]) => void;
  onEditorModeChange: (mode: MemoEditorMode) => void;
}

export function MemoEditorHeader({
  draft,
  groups,
  editorMode,
  currentPermission,
  canEdit,
  canManage,
  onTitleChange,
  onGroupChange,
  onStatusChange,
  onEditorModeChange,
}: MemoEditorHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="shrink-0 border-b border-border bg-card p-4">
      <Input
        value={draft.title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={!canEdit}
        className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-semibold tracking-normal shadow-none focus-visible:border-transparent focus-visible:ring-0"
        placeholder={t("memo.title.placeholder")}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!draft.isShared && (
            <div
              className="inline-flex h-6 items-center rounded-md border border-input bg-background px-1 text-xs text-muted-foreground"
              title={t("memo.groups")}
            >
              <MemoGroupDropdown
                groups={groups}
                value={draft.groupId}
                onChange={onGroupChange}
                disabled={!canManage}
              />
            </div>
          )}
          <div className="flex h-6 shrink-0 items-center rounded-md bg-muted p-0.5">
            {memoStatusOptions.map((status) => (
              <Button
                key={status.value}
                type="button"
                variant="ghost"
                onClick={() => onStatusChange(status.value)}
                disabled={!canEdit}
                className={cn(
                  "h-5 gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium hover:text-foreground",
                  draft.status === status.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", status.colorClassName)} />
                {t(memoStatusKey(status.value))}
              </Button>
            ))}
          </div>
          <span className="truncate">{t("memo.updatedAt", { time: formatMemoDate(draft.updateTime) })}</span>
          {(draft.updateDisplayName || draft.updateUsername) && (
            <span className="truncate">
              {t("memo.updatedBy", { name: draft.updateDisplayName || draft.updateUsername || "-" })}
            </span>
          )}
          {draft.isShared && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 text-primary">
              <Users className="h-3.5 w-3.5" />
              {t("memo.sharedBy", { username: draft.ownerUsername })}
            </span>
          )}
          <MemoPermissionBadge permission={currentPermission} />
        </div>
        <Tabs value={editorMode} onValueChange={(value) => onEditorModeChange(value as MemoEditorMode)}>
          <TabsList className="h-7">
            <TabsTrigger value="visual" className="h-6 gap-1 px-2.5">
              <FileText className="h-3 w-3" />
              {t("memo.editor.visual")}
            </TabsTrigger>
            <TabsTrigger value="markdown" className="h-6 gap-1 px-2.5">
              <FileCode2 className="h-3 w-3" />
              {t("memo.editor.markdown")}
            </TabsTrigger>
            <TabsTrigger value="split" className="h-6 gap-1 px-2.5">
              <Columns2 className="h-3 w-3" />
              {t("memo.editor.split")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

function MemoGroupDropdown({
  groups,
  value,
  onChange,
  disabled = false,
}: {
  groups: MemoGroup[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const selectedGroup = groups.find((group) => group.id === value) ?? groups[0];

  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))} disabled={disabled}>
      <SelectTrigger className="h-5 w-[150px] max-w-[38vw] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-2 focus:ring-primary/20 [&>span]:flex [&>span]:items-center">
        <span className="inline-flex h-full min-w-0 items-center gap-1.5 leading-none">
          <MemoGroupIcon group={selectedGroup} className="h-3.5 w-3.5" />
          <span className="min-w-0 truncate">{selectedGroup?.name ?? "-"}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="w-44">
        {groups.map((group) => (
          <SelectItem key={group.id} value={String(group.id)} className="text-xs" hideIndicator>
            <span className="inline-flex min-w-0 items-center gap-1.5 leading-none">
              <MemoGroupIcon group={group} className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">{group.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
