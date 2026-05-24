/**
 * 请求拦截器
 * 
 * 自动注入 Authorization 头和请求 ID。
 * 
 * @module core/http/interceptors
 */
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * 请求拦截器函数
 * 
 * 自动从 authStore 获取 token 并注入到 Authorization 头。
 */
export function requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 从 authStore 获取 token
  const token = useAuthStore.getState().accessToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['unicomm-token'] = token;
    config.headers.satoken = token;
  }
  
  // 添加请求 ID（用于日志追踪）
  config.headers['X-Request-ID'] = crypto.randomUUID();
  
  return config;
}
