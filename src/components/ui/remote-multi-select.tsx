import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export interface RemoteSelectOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

interface RemoteMultiSelectProps<TOption extends RemoteSelectOption> {
  value: TOption[];
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
  loadingText?: string;
  noResultText?: string;
  className?: string;
  search: (keyword: string) => Promise<TOption[]>;
  onChange: (value: TOption[]) => void;
  renderPrefix?: () => React.ReactNode;
  renderSelected?: (option: TOption, actions: { remove: () => void; disabled: boolean }) => React.ReactNode;
  filterOption?: (option: TOption, selected: TOption[]) => boolean;
}

export function RemoteMultiSelect<TOption extends RemoteSelectOption>({
  value,
  disabled = false,
  placeholder,
  emptyText,
  loadingText = "Loading...",
  noResultText = "No results",
  className,
  search,
  onChange,
  renderPrefix,
  renderSelected,
  filterOption,
}: RemoteMultiSelectProps<TOption>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<TOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const selectedValues = useMemo(() => new Set(value.map((item) => item.value)), [value]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const normalized = keyword.trim();
    if (!normalized) {
      setOptions([]);
      setOpen(false);
      return;
    }

    let disposed = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await search(normalized);
        if (disposed) {
          return;
        }
        const filtered = result.filter((option) => {
          if (selectedValues.has(option.value)) {
            return false;
          }
          return filterOption ? filterOption(option, value) : true;
        });
        setOptions(filtered);
        setOpen(true);
      } catch {
        if (!disposed) {
          setOptions([]);
          setOpen(true);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [disabled, filterOption, keyword, search, selectedValues, value]);

  const selectOption = (option: TOption) => {
    if (selectedValues.has(option.value)) {
      return;
    }
    onChange([...value, option]);
    setKeyword("");
    setOptions([]);
    setOpen(false);
  };

  const removeOption = (option: TOption) => {
    onChange(value.filter((item) => item.value !== option.value));
  };

  const focusInput = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <Popover open={open && Boolean(keyword.trim())} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={rootRef} className={cn("relative", className)}>
          <div
            onMouseDown={focusInput}
            className={cn(
              "flex min-h-9 cursor-text flex-wrap items-start gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-xs transition-all",
              !disabled && "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-primary/10",
              disabled && "cursor-default opacity-80"
            )}
          >
            {renderPrefix && <div className="flex h-6 shrink-0 items-center">{renderPrefix()}</div>}
            <div className="relative flex min-w-[120px] flex-1 flex-wrap items-center gap-1.5 pr-6">
              {value.length === 0 && disabled && emptyText && <span className="text-muted-foreground">{emptyText}</span>}
              {value.map((item) =>
                renderSelected ? (
                  <span key={item.value}>{renderSelected(item, { remove: () => removeOption(item), disabled })}</span>
                ) : (
                  <span
                    key={item.value}
                    className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs text-foreground"
                    title={[item.description, item.meta].filter(Boolean).join(" · ")}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.meta && <span className="shrink-0 text-muted-foreground">{item.meta}</span>}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeOption(item)}
                        className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                )
              )}

              {!disabled && (
                <input
                  ref={inputRef}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onFocus={() => {
                    if (keyword.trim()) {
                      setOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && options[0]) {
                      event.preventDefault();
                      selectOption(options[0]);
                    }
                    if (event.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                  className="h-6 min-w-[140px] flex-1 border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder={value.length === 0 ? placeholder : undefined}
                />
              )}
              {!disabled && (
                <Search className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-60 w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
          {loading ? (
            <div className="px-2 py-2 text-muted-foreground">{loadingText}</div>
          ) : options.length === 0 ? (
            <CommandEmpty>{noResultText}</CommandEmpty>
          ) : (
            options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => selectOption(option)}
                className="justify-between gap-3 text-xs"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-[11px] text-muted-foreground">{option.description}</span>
                  )}
                </span>
                {option.meta && <span className="shrink-0 text-[11px] text-muted-foreground">{option.meta}</span>}
              </CommandItem>
            ))
          )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
