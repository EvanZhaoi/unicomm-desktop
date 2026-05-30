import { translate, type MessageKey } from ".";
import { useSettingStore } from "@/stores/settingStore";

export function useI18n() {
  const language = useSettingStore((state) => state.language);

  return {
    language,
    t: (key: MessageKey, values?: Record<string, string | number>) =>
      translate(key, language, values),
  };
}
