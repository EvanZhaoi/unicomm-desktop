/**
 * Settings Store 模块
 *
 * 管理应用设置，包括：
 * - 主题设置
 * - 语言设置
 * - 通知设置
 * - 窗口设置
 *
 * ## 设计原则
 *
 * 所有用户设置通过此 Store 管理，确保：
 * - 设置的持久化
 * - 设置的响应式访问
 * - 设置的默认值
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '@/styles/themeManager';

/**
 * 设置状态接口
 */
interface SettingsState {
  // 主题设置
  themeMode: ThemeMode;
  // 语言设置
  language: string;
  // 通知设置
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  // 窗口设置
  window: {
    startWithSystem: boolean;
    minimizeToTray: boolean;
    confirmBeforeQuit: boolean;
  };
  shortcuts: {
    showMain: string;
    quickMemo: string;
  };
  // 最后同步时间
  lastSyncTime: number | null;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: string) => void;
  setNotifications: (notifications: Partial<SettingsState['notifications']>) => void;
  setWindowSettings: (window: Partial<SettingsState['window']>) => void;
  setShortcuts: (shortcuts: Partial<SettingsState['shortcuts']>) => void;
  setLastSyncTime: (time: number) => void;
  resetSettings: () => void;
}

/**
 * 默认设置值
 */
const defaultSettings = {
  themeMode: 'system' as ThemeMode,
  language: 'zh-CN',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
  },
  window: {
    startWithSystem: false,
    minimizeToTray: true,
    confirmBeforeQuit: true,
  },
  shortcuts: {
    showMain: 'Ctrl+Alt+M',
    quickMemo: 'Ctrl+Alt+N',
  },
  lastSyncTime: null,
};

/**
 * Settings Store
 *
 * 使用 zustand 的 persist 中间件自动持久化设置到 localStorage。
 */
export const useSettingStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setThemeMode: (mode) => set({ themeMode: mode }),

      setLanguage: (language) => set({ language }),

      setNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),

      setWindowSettings: (window) =>
        set((state) => ({
          window: { ...state.window, ...window },
        })),

      setShortcuts: (shortcuts) =>
        set((state) => ({
          shortcuts: { ...state.shortcuts, ...shortcuts },
        })),

      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'unicomm_settings', // localStorage key
      partialize: (state) => ({
        themeMode: state.themeMode,
        language: state.language,
        notifications: state.notifications,
        window: state.window,
        shortcuts: state.shortcuts,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
