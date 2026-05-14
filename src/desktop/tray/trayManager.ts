/**
 * System Tray Manager 模块
 *
 * 提供系统托盘功能，包括：
 * - 托盘图标管理
 * - 托盘菜单
 * - 托盘事件处理
 *
 * ## 功能说明
 *
 * - 显示/隐藏主窗口
 * - 最小化到托盘
 * - 后台运行
 * - 退出应用
 *
 * ## 使用方式
 *
 * @example
 * ```typescript
 * import { trayManager } from '@/desktop/tray/trayManager';
 *
 * // 初始化托盘
 * await trayManager.init();
 *
 * // 显示主窗口
 * await trayManager.showWindow();
 *
 * // 退出应用
 * await trayManager.quit();
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

// TODO: 需要 Tauri 插件支持 - tauri-plugin-tray
// 目前先定义接口，后续实现

/**
 * 托盘菜单项接口
 */
export interface TrayMenuItem {
  /** 菜单项 ID */
  id: string;
  /** 显示文本 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击事件回调 */
  onClick?: () => void;
}

/**
 * 托盘配置接口
 */
export interface TrayConfig {
  /** 托盘图标路径 */
  icon: string;
  /** 托盘提示文本 */
  tooltip?: string;
  /** 右键菜单项 */
  menuItems?: TrayMenuItem[];
}

/**
 * Tray Manager API
 */
export interface TrayManagerAPI {
  /**
   * 初始化托盘系统
   * 应用启动时调用一次
   */
  init(config?: TrayConfig): Promise<void>;

  /**
   * 销毁托盘
   * 应用退出时调用
   */
  destroy(): Promise<void>;

  /**
   * 显示主窗口
   * 从托盘点击或菜单触发
   */
  showWindow(): Promise<void>;

  /**
   * 隐藏主窗口
   * 最小化到托盘
   */
  hideWindow(): Promise<void>;

  /**
   * 切换窗口显示状态
   */
  toggleWindow(): Promise<void>;

  /**
   * 退出应用程序
   * 彻底退出，不只是隐藏
   */
  quit(): Promise<void>;

  /**
   * 更新托盘提示文本
   */
  setTooltip(text: string): Promise<void>;

  /**
   * 更新托盘菜单
   */
  setMenu(items: TrayMenuItem[]): Promise<void>;
}

/**
 * Tray Manager 实现
 *
 * Phase 1: 定义接口和基础实现
 * Phase 2: 接入 tauri-plugin-tray 实现完整功能
 */
class TrayManager implements TrayManagerAPI {
  private initialized = false;

  /**
   * 初始化托盘系统
   */
  async init(config?: TrayConfig): Promise<void> {
    if (this.initialized) {
      console.warn('[TrayManager] Already initialized');
      return;
    }

    // TODO: Phase 2 实现
    // await invoke('plugin:tray|init', { icon: config?.icon, tooltip: config?.tooltip });

    this.initialized = true;
    console.log('[TrayManager] Initialized');
  }

  /**
   * 销毁托盘
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // TODO: Phase 2 实现
    // await invoke('plugin:tray|destroy');

    this.initialized = false;
    console.log('[TrayManager] Destroyed');
  }

  /**
   * 显示主窗口
   */
  async showWindow(): Promise<void> {
    await invoke('plugin:window|show');
    await invoke('plugin:window|set_focus');
  }

  /**
   * 隐藏主窗口
   */
  async hideWindow(): Promise<void> {
    await invoke('plugin:window|hide');
  }

  /**
   * 切换窗口显示状态
   */
  async toggleWindow(): Promise<void> {
    const isVisible = await invoke<boolean>('plugin:window|is_visible');
    if (isVisible) {
      await this.hideWindow();
    } else {
      await this.showWindow();
    }
  }

  /**
   * 退出应用程序
   */
  async quit(): Promise<void> {
    // 先显示窗口确保用户看到退出操作
    await this.showWindow();
    // 延迟一下让用户看到，然后退出
    await new Promise((resolve) => setTimeout(resolve, 500));
    await invoke('plugin:app|exit');
  }

  /**
   * 更新托盘提示文本
   */
  async setTooltip(text: string): Promise<void> {
    // TODO: Phase 2 实现
    console.log('[TrayManager] Set tooltip:', text);
  }

  /**
   * 更新托盘菜单
   */
  async setMenu(items: TrayMenuItem[]): Promise<void> {
    // TODO: Phase 2 实现
    console.log('[TrayManager] Set menu:', items.length, 'items');
  }
}

/**
 * Tray Manager 单例
 */
export const trayManager = new TrayManager();