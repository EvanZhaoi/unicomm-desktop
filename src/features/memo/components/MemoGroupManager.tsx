import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { MemoGroup, MemoGroupInput } from "../types/memo.types";
import { MemoGroupIcon, memoGroupColorOptions, memoGroupIconOptions } from "./MemoGroupIcon";

export function MemoGroupManager({
  groups,
  isSaving,
  onCreate,
  onUpdate,
  onDelete,
}: {
  groups: MemoGroup[];
  isSaving: boolean;
  onCreate: (input: MemoGroupInput) => Promise<void>;
  onUpdate: (id: number, input: MemoGroupInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MemoGroup | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState(memoGroupColorOptions[0]);

  const resetForm = () => {
    setEditingGroup(null);
    setName("");
    setIcon("folder");
    setColor(memoGroupColorOptions[0]);
  };

  const editGroup = (group: MemoGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setIcon(group.icon || "folder");
    setColor(group.color || memoGroupColorOptions[0]);
  };

  const saveGroup = async () => {
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    const input: MemoGroupInput = {
      name: nextName,
      icon,
      color,
      sortOrder: editingGroup?.sortOrder,
    };

    if (editingGroup) {
      await onUpdate(editingGroup.id, input);
    } else {
      await onCreate(input);
    }
    resetForm();
  };

  const removeGroup = async (group: MemoGroup) => {
    if (group.isDefault || !window.confirm(t("memo.group.delete.confirm", { name: group.name }))) {
      return;
    }
    await onDelete(group.id);
    if (editingGroup?.id === group.id) {
      resetForm();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" title={t("memo.group.manage")}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">{t("memo.group.manage")}</div>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={resetForm}>
            <Plus className="h-3.5 w-3.5" />
            {t("memo.group.new")}
          </Button>
        </div>

        <div className="mb-3 max-h-36 overflow-auto rounded-md border border-border">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
              <MemoGroupIcon group={group} />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-primary"
                onClick={() => editGroup(group)}
                title={group.name}
              >
                {group.name}
              </button>
              <span className="shrink-0 text-[11px] text-muted-foreground">{group.memoCount}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => editGroup(group)}
                title={t("memo.group.edit")}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                disabled={group.isDefault || isSaving}
                onClick={() => removeGroup(group)}
                title={t("memo.group.delete")}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-8 text-xs"
            placeholder={t("memo.group.name.placeholder")}
          />

          <div className="grid max-h-40 grid-cols-6 gap-1 overflow-auto pr-1">
            {memoGroupIconOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex h-8 items-center justify-center rounded-md border border-border transition-colors hover:border-primary/60 hover:bg-accent",
                  icon === option.value && "border-primary bg-primary/10"
                )}
                onClick={() => setIcon(option.value)}
                title={option.value}
              >
                <MemoGroupIcon icon={option.value} color={color} />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {memoGroupColorOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md border border-border",
                  color === option && "ring-2 ring-primary/30"
                )}
                style={{ backgroundColor: option }}
                onClick={() => setColor(option)}
                title={option}
              >
                {color === option && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            ))}
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-6 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0"
              title={t("memo.group.color.custom")}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              {t("memo.group.cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isSaving || !name.trim()} onClick={saveGroup}>
              {editingGroup ? t("memo.group.save") : t("memo.group.create")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
