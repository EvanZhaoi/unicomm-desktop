/**
 * Notification Manager 模块
 *
 * 提供桌面通知功能，包括：
 * - 普通通知
 * - 重要通知
 * - 通知状态回调
 *
 * ## 使用方式
 *
 * @example
 * ```typescript
 * import { notificationManager } from '@/desktop/notification/notificationManager';
 *
 * // 发送普通通知
 * await notificationManager.notify({
 *   title: '新消息',
 *   body: '您有一条来自 Alice 的消息'
 * });
 *
 * // 发送重要通知
 * await notificationManager.notify({
 *   title: '系统通知',
 *   body: '请尽快处理',
 *   urgency: 'critical'
 * });
 * ```
 */
import {
  isPermissionGranted,
  onAction,
  requestPermission as requestSystemNotificationPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { Options } from '@tauri-apps/plugin-notification';
import type { PluginListener } from '@tauri-apps/api/core';

/**
 * 通知严重级别
 */
export enum NotificationUrgency {
  /** 低优先级 - 普通信息 */
  Low = 'low',
  /** 普通优先级 */
  Normal = 'normal',
  /** 高优先级 - 重要通知 */
  Critical = 'critical',
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body: string;
  /** 通知图标 */
  icon?: string;
  /** 严重级别 */
  urgency?: NotificationUrgency;
  /** 点击回调 */
  onClick?: () => void;
  /** 点击后需要打开的 Memo ID */
  memoId?: number;
  /** 超时时间（毫秒），0 表示不自动关闭 */
  timeout?: number;
}

/**
 * 通知结果接口
 */
export interface NotificationResult {
  /** 是否成功 */
  success: boolean;
  /** 通知 ID */
  id?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * Notification Manager API
 */
export interface NotificationManagerAPI {
  /**
   * 发送通知
   */
  notify(config: NotificationConfig): Promise<NotificationResult>;

  /**
   * 发送普通通知
   * @param title 标题
   * @param body 内容
   */
  notifyInfo(title: string, body: string): Promise<NotificationResult>;

  /**
   * 发送警告通知
   * @param title 标题
   * @param body 内容
   */
  notifyWarning(title: string, body: string): Promise<NotificationResult>;

  /**
   * 发送错误通知
   * @param title 标题
   * @param body 内容
   */
  notifyError(title: string, body: string): Promise<NotificationResult>;

  /**
   * 清除所有通知
   */
  clearAll(): Promise<void>;

  /**
   * 请求通知权限
   */
  requestPermission(): Promise<boolean>;
}

/**
 * Notification Manager 实现
 *
 * 系统通知由 Tauri notification 插件发送，Windows 下会进入系统通知中心并从屏幕右下角弹出。
 */
class NotificationManager implements NotificationManagerAPI {
  private permissionGranted = false;
  private actionListener: PluginListener | null = null;
  private actionListenerPromise: Promise<void> | null = null;
  private clickHandlers = new Map<number, () => void>();

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    this.permissionGranted = await isPermissionGranted();
    if (!this.permissionGranted) {
      const permission = await requestSystemNotificationPermission();
      this.permissionGranted = permission === 'granted';
    }
    return this.permissionGranted;
  }

  /**
   * 发送通知
   */
  async notify(config: NotificationConfig): Promise<NotificationResult> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        return {
          success: false,
          error: 'Notification permission denied',
        };
      }
    }

    try {
      await this.ensureActionListener();

      const id = Number.parseInt(`${Date.now()}`.slice(-9), 10);
      if (config.onClick) {
        this.clickHandlers.set(id, config.onClick);
      }

      sendNotification({
        id,
        title: config.title,
        body: config.body,
        icon: config.icon,
        group: 'unicomm.memo',
        extra: {
          memoId: config.memoId,
        },
        autoCancel: true,
      });

      return {
        success: true,
        id: `notification_${id}`,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  private async ensureActionListener(): Promise<void> {
    if (this.actionListener) {
      return;
    }
    if (this.actionListenerPromise) {
      return this.actionListenerPromise;
    }

    this.actionListenerPromise = onAction((notification: Options) => {
      const notificationId = notification.id;
      if (typeof notificationId !== 'number') {
        return;
      }

      const handler = this.clickHandlers.get(notificationId);
      this.clickHandlers.delete(notificationId);
      handler?.();
    })
      .then((listener) => {
        this.actionListener = listener;
      })
      .finally(() => {
        this.actionListenerPromise = null;
      });

    return this.actionListenerPromise;
  }

  /**
   * 发送普通通知
   */
  async notifyInfo(title: string, body: string): Promise<NotificationResult> {
    return this.notify({
      title,
      body,
      urgency: NotificationUrgency.Normal,
    });
  }

  /**
   * 发送警告通知
   */
  async notifyWarning(title: string, body: string): Promise<NotificationResult> {
    return this.notify({
      title,
      body,
      urgency: NotificationUrgency.Critical,
    });
  }

  /**
   * 发送错误通知
   */
  async notifyError(title: string, body: string): Promise<NotificationResult> {
    return this.notify({
      title,
      body,
      urgency: NotificationUrgency.Critical,
    });
  }

  /**
   * 清除所有通知
   */
  async clearAll(): Promise<void> {
    // 系统通知中心的历史清理后续再接 removeAllActive；当前功能只负责发送即时系统通知。
  }
}

/**
 * Notification Manager 单例
 */
export const notificationManager = new NotificationManager();
