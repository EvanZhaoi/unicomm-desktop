/**
 * Window Manager 模块
 *
 * 提供窗口生命周期管理功能，包括：
 * - 窗口操作（关闭、最小化、最大化、恢复）
 * - 窗口状态查询
 * - 窗口焦点管理
 *
 * ## 使用方式
 *
 * 所有页面组件必须通过此模块操作窗口，禁止直接调用 Tauri invoke。
 *
 * @example
 * ```typescript
 * import { windowManager } from '@/desktop/window/windowManager';
 *
 * // 关闭窗口
 * await windowManager.close();
 *
 * // 最小化到托盘
 * await windowManager.minimize();
 *
 * // 恢复窗口
 * await windowManager.restore();
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * 窗口状态枚举
 */
export enum WindowState {
  /** 正常窗口状态 */
  Normal = 'normal',
  /** 最小化 */
  Minimized = 'minimized',
  /** 最大化 */
  Maximized = 'maximized',
  /** 全屏 */
  Fullscreen = 'fullscreen',
}

/**
 * 窗口信息接口
 */
export interface WindowInfo {
  /** 当前窗口标题 */
  title: string;
  /** 当前窗口状态 */
  state: WindowState;
  /** 是否获得焦点 */
  isFocused: boolean;
}

/**
 * Window Manager API
 */
export interface WindowManagerAPI {
  /**
   * 关闭窗口
   */
  close(): Promise<void>;

  /**
   * 最小化窗口
   */
  minimize(): Promise<void>;

  /**
   * 最大化窗口
   */
  maximize(): Promise<void>;

  /**
   * 恢复窗口（从最小化/最大化恢复）
   */
  restore(): Promise<void>;

  /**
   * 切换最大化状态
   */
  toggleMaximize(): Promise<void>;

  /**
   * 最小化到系统托盘
   * 实现：隐藏窗口但不退出应用
   */
  minimizeToTray(): Promise<void>;

  /**
   * 显示窗口（从托盘恢复）
   */
  show(): Promise<void>;

  /**
   * 设置窗口焦点
   */
  setFocus(): Promise<void>;

  /**
   * 检查窗口是否获得焦点
   */
  isFocused(): Promise<boolean>;

  /**
   * 获取窗口信息
   */
  getInfo(): Promise<WindowInfo>;

  /**
   * 进入全屏
   */
  enterFullscreen(): Promise<void>;

  /**
   * 退出全屏
   */
  exitFullscreen(): Promise<void>;

  /**
   * 切换全屏状态
   */
  toggleFullscreen(): Promise<void>;
}

/**
 * Window Manager 实现
 *
 * 封装 Tauri 窗口操作，提供统一的窗口管理接口。
 */
class WindowManager implements WindowManagerAPI {
  /**
   * 关闭应用窗口
   * 这会退出整个应用程序
   */
  async close(): Promise<void> {
    await invoke('plugin:window|close');
  }

  /**
   * 最小化窗口到任务栏
   */
  async minimize(): Promise<void> {
    await invoke('plugin:window|minimize');
  }

  /**
   * 最大化窗口
   */
  async maximize(): Promise<void> {
    await invoke('plugin:window|maximize');
  }

  /**
   * 恢复窗口
   * 从最小化或最大化状态恢复到正常大小
   */
  async restore(): Promise<void> {
    await invoke('plugin:window|unmaximize');
  }

  /**
   * 切换最大化状态
   */
  async toggleMaximize(): Promise<void> {
    await invoke('plugin:window|toggle_maximize');
  }

  /**
   * 最小化到系统托盘
   * 隐藏窗口但不退出应用
   */
  async minimizeToTray(): Promise<void> {
    await invoke('plugin:window|hide');
  }

  /**
   * 显示窗口
   * 从托盘或隐藏状态恢复窗口
   */
  async show(): Promise<void> {
    await invoke('plugin:window|show');
  }

  /**
   * 设置窗口焦点
   */
  async setFocus(): Promise<void> {
    await invoke('plugin:window|set_focus');
  }

  /**
   * 检查窗口是否获得焦点
   */
  async isFocused(): Promise<boolean> {
    return await invoke('plugin:window|is_focused');
  }

  /**
   * 获取窗口信息
   */
  async getInfo(): Promise<WindowInfo> {
    const isMaximized = await invoke<boolean>('plugin:window|is_maximized');
    const isFocused = await this.isFocused();

    return {
      title: 'UniComm', // TODO: 从 Tauri 获取实际标题
      state: isMaximized ? WindowState.Maximized : WindowState.Normal,
      isFocused,
    };
  }

  /**
   * 进入全屏
   */
  async enterFullscreen(): Promise<void> {
    await invoke('plugin:window|set_fullscreen', { fullscreen: true });
  }

  /**
   * 退出全屏
   */
  async exitFullscreen(): Promise<void> {
    await invoke('plugin:window|set_fullscreen', { fullscreen: false });
  }

  /**
   * 切换全屏状态
   */
  async toggleFullscreen(): Promise<void> {
    const isFullscreen = await invoke<boolean>('plugin:window|is_fullscreen');
    await invoke('plugin:window|set_fullscreen', { fullscreen: !isFullscreen });
  }
}

/**
 * Window Manager 单例
 */
export const windowManager = new WindowManager();