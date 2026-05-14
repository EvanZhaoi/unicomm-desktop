/**
 * Session Storage Service 模块
 *
 * 提供 Session 持久化功能，包括：
 * - Session 数据读写
 * - Token 管理
 * - 应用重启后 Session 恢复
 *
 * ## 设计原则
 *
 * 统一管理 Session 存储，禁止散落 localStorage。
 * 所有 Session 相关数据必须通过此服务访问。
 */

import type { DesktopUserInfo } from '@/features/auth/types/auth.types';
import type { DeviceInfo } from '@/desktop/device/DeviceService';

/**
 * Session 数据结构
 */
export interface SessionData {
  /** 访问令牌 */
  accessToken: string;
  /** 当前用户信息 */
  currentUser: DesktopUserInfo;
  /** 设备信息 */
  deviceInfo: DeviceInfo;
  /** 认证状态 */
  authStatus: string;
  /** 认证时间 */
  authTime: number;
  /** Token 过期时间（Unix timestamp） */
  expiresAt: number;
}

/**
 * Session Storage Service API
 */
export interface SessionStorageServiceAPI {
  /**
   * 保存 Session 数据
   */
  saveSession(data: SessionData): Promise<void>;

  /**
   * 读取 Session 数据
   * 应用启动时调用，恢复之前的 Session
   */
  loadSession(): Promise<SessionData | null>;

  /**
   * 清除 Session 数据
   * 退出登录或 Session 失效时调用
   */
  clearSession(): Promise<void>;

  /**
   * 检查 Session 是否有效
   */
  isSessionValid(): Promise<boolean>;

  /**
   * 获取 Token
   */
  getToken(): Promise<string | null>;

  /**
   * 更新 Token
   */
  updateToken(token: string, expiresAt: number): Promise<void>;
}

/**
 * Session Storage Service 实现
 *
 * 使用 localStorage 持久化 Session 数据。
 * 应用重启后自动恢复 Session。
 */
class SessionStorageService implements SessionStorageServiceAPI {
  private readonly SESSION_KEY = 'unicomm_session';

  /**
   * Session 过期时间（默认 24 小时）
   */
  private readonly SESSION_EXPIRE_MS = 24 * 60 * 60 * 1000;

  /**
   * 保存 Session 数据到 localStorage
   */
  async saveSession(data: SessionData): Promise<void> {
    try {
      const sessionJson = JSON.stringify(data);
      localStorage.setItem(this.SESSION_KEY, sessionJson);
      console.log('[SessionStorage] Session saved');
    } catch (error) {
      console.error('[SessionStorage] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * 从 localStorage 读取 Session 数据
   */
  async loadSession(): Promise<SessionData | null> {
    try {
      const sessionJson = localStorage.getItem(this.SESSION_KEY);
      if (!sessionJson) {
        console.log('[SessionStorage] No session found');
        return null;
      }

      const session: SessionData = JSON.parse(sessionJson);

      // 检查是否过期
      if (Date.now() > session.expiresAt) {
        console.log('[SessionStorage] Session expired');
        await this.clearSession();
        return null;
      }

      console.log('[SessionStorage] Session loaded');
      return session;
    } catch (error) {
      console.error('[SessionStorage] Failed to load session:', error);
      return null;
    }
  }

  /**
   * 清除 Session 数据
   */
  async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      console.log('[SessionStorage] Session cleared');
    } catch (error) {
      console.error('[SessionStorage] Failed to clear session:', error);
    }
  }

  /**
   * 检查 Session 是否有效
   */
  async isSessionValid(): Promise<boolean> {
    const session = await this.loadSession();
    if (!session) {
      return false;
    }

    // 检查是否过期
    return Date.now() <= session.expiresAt;
  }

  /**
   * 获取 Token
   */
  async getToken(): Promise<string | null> {
    const session = await this.loadSession();
    return session?.accessToken ?? null;
  }

  /**
   * 更新 Token（刷新 Token 时使用）
   */
  async updateToken(token: string, expiresAt: number): Promise<void> {
    const session = await this.loadSession();
    if (session) {
      session.accessToken = token;
      session.expiresAt = expiresAt;
      await this.saveSession(session);
    }
  }

  /**
   * 创建默认的过期时间
   */
  private createExpiresAt(): number {
    return Date.now() + this.SESSION_EXPIRE_MS;
  }
}

/**
 * Session Storage Service 单例
 */
export const sessionStorageService = new SessionStorageService();