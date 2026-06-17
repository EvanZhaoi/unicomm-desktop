import type { ReactNode } from "react";

interface MemoEmptyStateProps {
  icon: ReactNode;
  title: string;
}

export function MemoEmptyState({ icon, title }: MemoEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
    </div>
  );
}
