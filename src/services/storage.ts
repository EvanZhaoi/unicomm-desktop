/**
 * 本地存储服务
 * 
 * 基于 localStorage 的封装，为 UniComm Desktop 提供持久化数据存储能力。
 * 所有数据键名自动添加 `unicomm_` 前缀以避免与其他应用冲突。
 * 
 * ## 功能特性
 * - **命名空间隔离**: 所有键自动添加 `unicomm_` 前缀
 * - **JSON 序列化**: 自动处理对象/数组的序列化与反序列化
 * - **容错处理**: 解析失败或配额超限时返回默认值，不抛出异常
 * 
 * ## 使用示例
 * ```typescript
 * import { storage } from '@/services/storage';
 * 
 * // 存储数据
 * storage.set('user_preferences', { theme: 'dark', language: 'zh-CN' });
 * 
 * // 读取数据（带默认值）
 * const prefs = storage.get<UserPreferences>('user_preferences', { theme: 'light' });
 * 
 * // 清除所有 unicomm_ 相关数据
 * storage.clear();
 * ```
 * 
 * @module services/storage
 */

/** localStorage 键名前缀，用于隔离不同应用的数据 */
const STORAGE_PREFIX = "unicomm_";

/**
 * 存储服务对象
 * 
 * 提供 get/set/remove/clear 四个基础操作，全部基于 localStorage 实现。
 */
export const storage = {
  /**
   * 从 localStorage 读取数据
   * 
   * @typeParam T - 返回值的类型参数
   * @param key - 存储键名（不含前缀）
   * @param defaultValue - 可选的默认值，当键不存在或解析失败时返回
   * @returns 解析后的对象，或默认值/null
   * 
   * @example
   * ```typescript
   * // 读取用户信息
   * const user = storage.get<UserInfo>('current_user');
   * 
   * // 读取不存在的键，使用默认值
   * const theme = storage.get<string>('theme', 'light');
   * ```
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      // 尝试解析 JSON，失败时返回默认值
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      // JSON 解析错误或 localStorage 不可用
      return defaultValue ?? null;
    }
  },

  /**
   * 将数据写入 localStorage
   * 
   * @typeParam T - 待存储数据的类型
   * @param key - 存储键名（不含前缀）
   * @param value - 待存储的值（自动 JSON 序列化）
   * 
   * @example
   * ```typescript
   * storage.set('access_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * storage.set('recent_memos', [{ id: 1, title: '会议纪要' }]);
   * ```
   */
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // 配额超限（QUOTA_EXCEEDED_ERR）或其他 localStorage 错误，静默忽略
    }
  },

  /**
   * 删除指定键名的数据
   * 
   * @param key - 存储键名（不含前缀）
   * 
   * @example
   * ```typescript
   * // 清除登录凭证
   * storage.remove('access_token');
   * ```
   */
  remove: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  /**
   * 清除所有 unicomm_ 前缀的存储数据
   * 
   * 用于用户退出登录或需要重置应用状态时。
   * 会遍历 localStorage 所有键，仅删除本应用相关的数据。
   * 
   * @example
   * ```typescript
   * // 退出登录时清除所有本地数据
   * storage.clear();
   * ```
   */
  clear: (): void => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};