import { useEffect, useRef } from "react";

interface UseDocumentShortcutOptions {
  key: string;
  ctrlOrMeta?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
  onTrigger: (event: KeyboardEvent) => void;
}

/**
 * Registers a document-level keyboard shortcut with a stable callback reference.
 * Business components only describe the shortcut they need and do not manage
 * add/remove listener details directly.
 */
export function useDocumentShortcut({
  key,
  ctrlOrMeta = false,
  enabled = true,
  preventDefault = true,
  onTrigger,
}: UseDocumentShortcutOptions) {
  const triggerRef = useRef(onTrigger);

  useEffect(() => {
    triggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const normalizedKey = key.toLowerCase();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (ctrlOrMeta && !(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.key.toLowerCase() !== normalizedKey) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }
      triggerRef.current(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ctrlOrMeta, enabled, key, preventDefault]);
}
