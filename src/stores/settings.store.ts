/**
 * 设置状态管理模块 (Zustand Store)
 * 
 * 管理 UniComm Desktop 的应用设置，包括：
 * - **主题 (theme)**: light / dark / system（跟随系统）
 * - **侧边栏折叠状态 (sidebarCollapsed)**
 * 
 * ## 主题说明
 * - `light`: 强制亮色模式
 * - `dark`: 强制暗色模式
 * - `system`: 跟随操作系统设置（通过 `prefers-color-scheme` 检测）
 * 
 * ## 使用示例
 * ```typescript
 * import { useSettingsStore } from '@/stores/settings.store';
 * 
 * function ThemeToggle() {
 *   const { theme, setTheme } = useSettingsStore();
 * 
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
 *       <option value="light">浅色</option>
 *       <option value="dark">深色</option>
 *       <option value="system">跟随系统</option>
 *     </select>
 *   );
 * }
 * ```
 * 
 * @module stores/settings.store
 * @requires zustand
 */

import { create } from 'zustand';

/** 支持的主题模式 */
type Theme = "light" | "dark" | "system";

/**
 * 设置 Store 的状态接口
 */
interface SettingsState {
  /** 当前主题设置 */
  theme: Theme;
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /**
   * 设置主题
   * @param theme - 新的主题值
   */
  setTheme: (theme: Theme) => void;
  /**
   * 切换侧边栏折叠状态
   */
  toggleSidebar: () => void;
}

/**
 * 设置状态管理 Store
 * 
 * 管理应用的主题和布局设置。
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  // 初始状态：默认跟随系统主题，侧边栏展开
  theme: "system",
  sidebarCollapsed: false,

  /**
   * 设置主题
   * 
   * 设置后立即更新 DOM 的 class 以应用主题。
   * - `dark`: 添加 `dark` class 到 `<html>`
   * - `light`: 移除 `dark` class
   * - `system`: 检测系统偏好并应用
   * 
   * @param theme - 目标主题
   */
  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // system: 检测系统偏好
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    }
  },

  /**
   * 切换侧边栏折叠状态
   * 
   * 用于用户点击菜单按钮时展开/收起侧边栏。
   */
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));