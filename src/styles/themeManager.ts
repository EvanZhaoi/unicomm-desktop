/**
 * Theme Manager 模块
 *
 * 提供主题管理功能，包括：
 * - 深色/浅色/跟随系统 三种模式
 * - 主题切换
 * - 主题持久化
 *
 * ## 使用方式
 *
 * @example
 * ```typescript
 * import { themeManager, ThemeMode } from '@/styles/themeManager';
 *
 * // 切换到深色模式
 * await themeManager.setTheme(ThemeMode.Dark);
 *
 * // 切换到浅色模式
 * await themeManager.setTheme(ThemeMode.Light);
 *
 * // 跟随系统
 * await themeManager.setTheme(ThemeMode.System);
 * ```
 */

/**
 * 主题模式枚举
 */
export enum ThemeMode {
  /** 浅色模式 */
  Light = 'light',
  /** 深色模式 */
  Dark = 'dark',
  /** 跟随系统 */
  System = 'system',
}

/**
 * 实际生效的主题（跟随系统时根据系统偏好解析）
 */
export enum ResolvedTheme {
  /** 浅色 */
  Light = 'light',
  /** 深色 */
  Dark = 'dark',
}

/**
 * 主题信息接口
 */
export interface ThemeInfo {
  /** 当前主题模式 */
  mode: ThemeMode;
  /** 实际生效的主题 */
  resolved: ResolvedTheme;
}

/**
 * 主题变化回调接口
 */
export type ThemeChangeCallback = (theme: ResolvedTheme) => void;

/**
 * Theme Manager API
 */
export interface ThemeManagerAPI {
  /**
   * 获取当前主题信息
   */
  getTheme(): ThemeInfo;

  /**
   * 设置主题模式
   * @param mode 主题模式
   */
  setTheme(mode: ThemeMode): Promise<void>;

  /**
   * 切换主题
   * Light → Dark → System → Light
   */
  toggleTheme(): Promise<void>;

  /**
   * 监听主题变化
   * @param callback 主题变化回调
   */
  onThemeChange(callback: ThemeChangeCallback): void;

  /**
   * 初始化主题
   * 应用启动时调用，恢复之前的主题设置
   */
  init(): Promise<void>;
}

/**
 * Theme Manager 实现
 */
class ThemeManager implements ThemeManagerAPI {
  private currentMode: ThemeMode = ThemeMode.System;
  private listeners: ThemeChangeCallback[] = [];
  private mediaQuery: MediaQueryList | null = null;

  /**
   * 初始化主题管理器
   * 从持久化存储恢复主题设置，并监听系统主题变化
   */
  async init(): Promise<void> {
    // 从设置存储恢复主题
    // TODO: 后续接入真实的 settingStore
    // const savedMode = await settingStore.getThemeMode();
    // this.currentMode = savedMode || ThemeMode.System;

    // 监听系统主题变化
    this.setupSystemThemeListener();

    // 应用主题
    await this.applyTheme();

    console.log('[ThemeManager] Initialized with mode:', this.currentMode);
  }

  /**
   * 设置系统主题监听器
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // 监听系统主题变化
      this.mediaQuery.addEventListener('change', (e) => {
        if (this.currentMode === ThemeMode.System) {
          const resolved = e.matches ? ResolvedTheme.Dark : ResolvedTheme.Light;
          this.notifyListeners(resolved);
        }
      });
    }
  }

  /**
   * 获取当前主题信息
   */
  getTheme(): ThemeInfo {
    return {
      mode: this.currentMode,
      resolved: this.resolveTheme(),
    };
  }

  /**
   * 设置主题模式
   */
  async setTheme(mode: ThemeMode): Promise<void> {
    if (this.currentMode === mode) {
      return;
    }

    this.currentMode = mode;
    await this.applyTheme();

    // 持久化主题设置
    // TODO: 保存到 settingStore
    // await settingStore.setThemeMode(mode);

    console.log('[ThemeManager] Theme set to:', mode);
  }

  /**
   * 切换主题
   * 循环切换: Light → Dark → System → Light
   */
  async toggleTheme(): Promise<void> {
    const modes = [ThemeMode.Light, ThemeMode.Dark, ThemeMode.System];
    const currentIndex = modes.indexOf(this.currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    await this.setTheme(modes[nextIndex]);
  }

  /**
   * 监听主题变化
   */
  onThemeChange(callback: ThemeChangeCallback): void {
    this.listeners.push(callback);
  }

  /**
   * 应用主题到 DOM
   */
  private async applyTheme(): Promise<void> {
    const resolved = this.resolveTheme();

    // 设置 data-theme 属性用于 CSS 选择
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }

    // 通知监听器
    this.notifyListeners(resolved);
  }

  /**
   * 解析实际生效的主题
   */
  private resolveTheme(): ResolvedTheme {
    if (this.currentMode === ThemeMode.System) {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? ResolvedTheme.Dark
          : ResolvedTheme.Light;
      }
      return ResolvedTheme.Light;
    }

    return this.currentMode === ThemeMode.Dark ? ResolvedTheme.Dark : ResolvedTheme.Light;
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(theme: ResolvedTheme): void {
    this.listeners.forEach((callback) => {
      try {
        callback(theme);
      } catch (error) {
        console.error('[ThemeManager] Listener error:', error);
      }
    });
  }
}

/**
 * Theme Manager 单例
 */
export const themeManager = new ThemeManager();
