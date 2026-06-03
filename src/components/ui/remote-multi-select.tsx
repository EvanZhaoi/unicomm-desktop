import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
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
  filterOption,
}: RemoteMultiSelectProps<TOption>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<TOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const selectedValues = useMemo(() => new Set(value.map((item) => item.value)), [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-xs transition-all",
          !disabled && "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-primary/10",
          disabled && "opacity-80"
        )}
      >
        {renderPrefix?.()}
        {value.length === 0 && disabled && emptyText && <span className="text-muted-foreground">{emptyText}</span>}
        {value.map((item) => (
          <span
            key={item.value}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-2 text-xs text-foreground"
            title={[item.description, item.meta].filter(Boolean).join(" · ")}
          >
            {item.label}
            {item.meta && <span className="text-muted-foreground">{item.meta}</span>}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeOption(item)}
                className="rounded-sm text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <span className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
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
              className="h-6 w-full border-0 bg-transparent pl-5 pr-1 text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={value.length === 0 ? placeholder : undefined}
          />
          </span>
        )}
      </div>

      {open && keyword.trim() && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full min-w-[280px] overflow-auto rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-lg">
          {loading ? (
            <div className="px-2 py-2 text-muted-foreground">{loadingText}</div>
          ) : options.length === 0 ? (
            <div className="px-2 py-2 text-muted-foreground">{noResultText}</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectOption(option)}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-[11px] text-muted-foreground">{option.description}</span>
                  )}
                </span>
                {option.meta && <span className="shrink-0 text-[11px] text-muted-foreground">{option.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
