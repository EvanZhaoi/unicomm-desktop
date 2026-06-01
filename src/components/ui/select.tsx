import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  selectClassName?: string;
}

/**
 * 统一应用内 select 外观。
 *
 * 仍使用原生 select 保留键盘、系统辅助功能和表单行为，
 * 外层只负责隐藏不同平台默认箭头并补充一致的边框、焦点和图标样式。
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, selectClassName, children, ...props }, ref) => {
    return (
      <span className={cn("relative inline-flex", className)}>
        <select
          ref={ref}
          className={cn(
            "h-8 w-full appearance-none rounded-md border border-input bg-background py-0 pl-3 pr-8 text-sm text-foreground outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
            selectClassName
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    );
  }
);

Select.displayName = "Select";
