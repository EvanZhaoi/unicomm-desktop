/**
 * 内存缓存服务
 * 
 * 基于 Map 的轻量级内存缓存，为 UniComm Desktop 提供数据缓存能力。
 * 支持 TTL（Time-To-Live）过期机制，可设置每个缓存项的存活时间。
 * 
 * ## 与 storage.ts 的区别
 * - **storage**: 持久化到 localStorage，页面刷新后保留
 * - **cache**: 保存在内存中，页面刷新后清除
 * 
 * ## 使用场景
 * - API 响应数据的临时缓存，减少重复请求
 * - 用户信息、设备信息等相对稳定的数据
 * - 需要频繁读取但不希望每次都调用后端的数据
 * 
 * ## 使用示例
 * ```typescript
 * import { cacheService } from '@/services/cache';
 * 
 * // 缓存设备信息，5分钟有效期（默认）
 * cacheService.set('device_info', deviceData);
 * 
 * // 读取缓存（若过期自动删除并返回 null）
 * const cached = cacheService.get<DeviceInfo>('device_info');
 * 
 * // 自定义 TTL：缓存 30 秒
 * cacheService.set('temp_data', data, 30 * 1000);
 * 
 * // 清除单个缓存
 * cacheService.delete('temp_data');
 * 
 * // 清除所有缓存（如退出登录时）
 * cacheService.clear();
 * ```
 * 
 * @module services/cache
 */

/** 内存缓存存储，键为缓存标识符，值为数据及过期时间戳 */
const cache = new Map<string, { data: unknown; expiry: number }>();

/**
 * 缓存服务对象
 * 
 * 提供 get/set/delete/clear 四个操作，支持 TTL 过期机制。
 */
export const cacheService = {
  /**
   * 读取缓存数据
   * 
   * 若缓存不存在或已过期，自动删除该键并返回 null。
   * 
   * @typeParam T - 返回值的类型
   * @param key - 缓存键名
   * @returns 缓存的数据（未过期），或 null（不存在或已过期）
   * 
   * @example
   * ```typescript
   * const userInfo = cacheService.get<UserInfo>('current_user');
   * if (!userInfo) {
   *   // 缓存未命中，需要重新获取
   *   userInfo = await fetchUserInfo();
   *   cacheService.set('current_user', userInfo);
   * }
   * ```
   */
  get: <T>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    // 检查是否过期
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /**
   * 设置缓存数据
   * 
   * @typeParam T - 待缓存数据的类型
   * @param key - 缓存键名
   * @param data - 待缓存的数据
   * @param ttlMs - 存活时间（毫秒），默认 5 分钟
   * 
   * @example
   * ```typescript
   * // 缓存 10 秒
   * cacheService.set('api_response', responseData, 10 * 1000);
   * 
   * // 缓存 1 小时
   * cacheService.set('stable_config', configData, 60 * 60 * 1000);
   * ```
   */
  set: <T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
  },

  /**
   * 删除指定缓存
   * 
   * @param key - 缓存键名
   * 
   * @example
   * ```typescript
   * // 数据已更新，主动清除旧缓存
   * cacheService.delete('user_profile');
   * ```
   */
  delete: (key: string): void => {
    cache.delete(key);
  },

  /**
   * 清除所有缓存
   * 
   * 通常在用户退出登录或需要重置应用状态时调用。
   * 
   * @example
   * ```typescript
   * // 退出登录时清除所有内存缓存
   * cacheService.clear();
   * ```
   */
  clear: (): void => {
    cache.clear();
  },
};