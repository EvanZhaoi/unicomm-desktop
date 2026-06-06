import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { MemoGroup, MemoGroupInput } from "../types/memo.types";
import { MemoGroupIcon, memoGroupColorOptions, memoGroupIconOptions } from "./MemoGroupIcon";

export function MemoGroupManager({
  group,
  isSaving,
  onCreate,
  onUpdate,
  onDelete,
}: {
  group?: MemoGroup;
  isSaving: boolean;
  onCreate: (input: MemoGroupInput) => Promise<void>;
  onUpdate: (id: number, input: MemoGroupInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState(memoGroupColorOptions[0]);
  const isEditing = Boolean(group);

  const resetForm = () => {
    setName(group?.name ?? "");
    setIcon(group?.icon || "folder");
    setColor(group?.color || memoGroupColorOptions[0]);
  };

  const changeOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
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
      sortOrder: group?.sortOrder,
    };

    if (group) {
      await onUpdate(group.id, input);
    } else {
      await onCreate(input);
    }
    setOpen(false);
  };

  const removeGroup = async () => {
    if (!group) {
      return;
    }
    if (group.isDefault || !window.confirm(t("memo.group.delete.confirm", { name: group.name }))) {
      return;
    }
    await onDelete(group.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant={isEditing ? "ghost" : "outline"}
          className={cn("h-7 w-7 shrink-0", isEditing && "text-muted-foreground hover:text-foreground")}
          title={isEditing ? t("memo.group.edit") : t("memo.group.new")}
        >
          {isEditing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={isEditing ? "end" : "start"} className="w-[340px] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">
            {isEditing ? t("memo.group.edit") : t("memo.group.new")}
          </div>
          {group && (
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <MemoGroupIcon group={group} />
              <span className="max-w-36 truncate">{group.name}</span>
            </div>
          )}
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
            {group && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                disabled={group.isDefault || isSaving}
                onClick={removeGroup}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("memo.group.delete")}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              {t("memo.group.cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isSaving || !name.trim()} onClick={saveGroup}>
              {isEditing ? t("memo.group.save") : t("memo.group.create")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
