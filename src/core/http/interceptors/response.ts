/**
 * 响应拦截器
 * 
 * 统一处理：
 * - 2xx: 直接返回
 * - 401/403: 清除 Session，抛出 AuthError
 * - 4xx: 抛出 ApiError
 * - 5xx: 抛出 ApiError
 * - 网络错误: 抛出 NetworkError
 * 
 * @module core/http/interceptors
 */
import type { AxiosError } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ApiError } from '../errors/ApiError';
import { NetworkError } from '../errors/NetworkError';
import { AuthError } from '../errors/AuthError';
import type { ApiResponse } from '../types/api';

/**
 * 响应错误拦截器函数
 */
export function responseInterceptor(error: AxiosError): Promise<never> {
  const { response, code, message } = error;
  
  if (!response) {
    if (code === 'ECONNABORTED' || code === 'ERR_NETWORK') {
      throw new NetworkError('网络连接失败，请检查网络', code);
    }
    throw new NetworkError(message || '网络错误');
  }
  
  const status = response.status;
  
  // 认证错误 (401/403)
  if (status === 401 || status === 403) {
    // 清除本地 Session
    useAuthStore.getState().clearSession();
    throw new AuthError('认证失败，请重新登录', status);
  }
  
  // 其他 HTTP 错误
  const responseData = response.data as ApiResponse | undefined;
  const errorMessage = responseData?.message || `请求失败 (${status})`;
  
  throw new ApiError(errorMessage, status, response.data);
}