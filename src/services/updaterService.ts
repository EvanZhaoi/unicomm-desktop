/**
 * Updater Service 模块
 *
 * 提供应用更新功能，包括：
 * - 版本检查
 * - 更新状态
 * - 更新提示
 *
 * ## Phase 说明
 *
 * Phase 1: 定义接口和基础实现（仅结构）
 * Phase 2: 接入 tauri-plugin-updater 实现完整功能
 */

/**
 * 更新状态枚举
 */
export enum UpdateStatus {
  /** 未知 */
  Unknown = 'unknown',
  /** 没有更新 */
  UpToDate = 'up_to_date',
  /** 有可用更新 */
  Available = 'available',
  /** 下载中 */
  Downloading = 'downloading',
  /** 下载完成 */
  Downloaded = 'downloaded',
  /** 安装中 */
  Installing = 'installing',
  /** 更新错误 */
  Error = 'error',
}

/**
 * 版本信息接口
 */
export interface VersionInfo {
  /** 当前版本 */
  current: string;
  /** 最新版本 */
  latest?: string;
  /** 版本发布日期 */
  releaseDate?: string;
  /** 更新说明 */
  releaseNotes?: string;
}

/**
 * 更新进度接口
 */
export interface UpdateProgress {
  /** 已下载字节数 */
  downloaded: number;
  /** 总字节数 */
  total: number;
  /** 进度百分比 (0-100) */
  percent: number;
}

/**
 * Update Available 回调接口
 */
export interface UpdateAvailableCallback {
  (version: string, releaseNotes?: string): void;
}

/**
 * Update Progress 回调接口
 */
export interface UpdateProgressCallback {
  (progress: UpdateProgress): void;
}

/**
 * Updater Service API
 */
export interface UpdaterServiceAPI {
  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): Promise<string>;

  /**
   * 检查是否有可用更新
   */
  checkForUpdates(): Promise<VersionInfo>;

  /**
   * 下载更新
   * @param onProgress 进度回调
   */
  downloadUpdate(onProgress?: UpdateProgressCallback): Promise<void>;

  /**
   * 安装更新并重启应用
   */
  installAndRestart(): Promise<void>;

  /**
   * 监听更新可用事件
   */
  onUpdateAvailable(callback: UpdateAvailableCallback): void;

  /**
   * 获取更新状态
   */
  getStatus(): UpdateStatus;
}

/**
 * Updater Service 实现
 */
class UpdaterService implements UpdaterServiceAPI {
  private status: UpdateStatus = UpdateStatus.Unknown;

  /**
   * 获取当前版本
   */
  async getCurrentVersion(): Promise<string> {
    // 从 package.json 读取版本
    // TODO: 后续可从 Tauri 获取
    return '0.1.0';
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<VersionInfo> {
    const current = await this.getCurrentVersion();

    try {
      // TODO: Phase 2 实现
      // const result = await invoke<{ version: string; notes?: string; date?: string }>('plugin:updater|check');
      // this.status = result.version > current ? UpdateStatus.Available : UpdateStatus.UpToDate;

      // Phase 1: 模拟没有更新
      this.status = UpdateStatus.UpToDate;

      return {
        current,
        latest: current,
        releaseDate: undefined,
        releaseNotes: undefined,
      };
    } catch (error) {
      this.status = UpdateStatus.Error;
      console.error('[Updater] Check failed:', error);
      return { current };
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(onProgress?: UpdateProgressCallback): Promise<void> {
    if (this.status !== UpdateStatus.Available) {
      console.warn('[Updater] No update available to download');
      return;
    }

    this.status = UpdateStatus.Downloading;

    try {
      // TODO: Phase 2 实现
      // await invoke('plugin:updater|download', { onProgress });

      // Phase 1: 模拟下载
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          onProgress({
            downloaded: i * 1024 * 1024,
            total: 10 * 1024 * 1024,
            percent: i,
          });
        }
      }

      this.status = UpdateStatus.Downloaded;
      console.log('[Updater] Download complete');
    } catch (error) {
      this.status = UpdateStatus.Error;
      console.error('[Updater] Download failed:', error);
      throw error;
    }
  }

  /**
   * 安装更新并重启
   */
  async installAndRestart(): Promise<void> {
    if (this.status !== UpdateStatus.Downloaded) {
      console.warn('[Updater] Update not downloaded yet');
      return;
    }

    this.status = UpdateStatus.Installing;

    try {
      // TODO: Phase 2 实现
      // await invoke('plugin:updater|install_and_restart');

      console.log('[Updater] Install and restart');
    } catch (error) {
      this.status = UpdateStatus.Error;
      console.error('[Updater] Install failed:', error);
      throw error;
    }
  }

  /**
   * 监听更新可用事件
   */
  onUpdateAvailable(_callback: UpdateAvailableCallback): void {
    // TODO: Phase 2 实现
    // invoke('plugin:updater|listen', { event: 'update_available' }, callback);
    console.log('[Updater] Listening for update available events');
  }

  /**
   * 获取更新状态
   */
  getStatus(): UpdateStatus {
    return this.status;
  }
}

/**
 * Updater Service 单例
 */
export const updaterService = new UpdaterService();
