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
import type { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ApiError } from '../errors/ApiError';
import { NetworkError } from '../errors/NetworkError';
import { AuthError } from '../errors/AuthError';
import type { ApiResponse } from '../types/api';

/**
 * 判断认证失败后是否需要自动恢复 Session。
 *
 * `/auth/desktop/verify` 本身就是恢复链路的最后一步，如果它返回 401/403，
 * 说明当前 Windows 用户确实未通过后端校验，应交给 authStore 设置 rejected，
 * 不能在拦截器里再次触发 recoverSession 形成递归。
 */
function shouldRecoverSession(error: AxiosError): boolean {
  const url = error.config?.url || '';
  return !url.includes('/auth/desktop/verify') && !url.includes('/auth/token/refresh');
}

/**
 * 响应成功拦截器函数
 *
 * 后端统一返回 { code, message, data }，业务层只关心 data。
 * 如果后端业务 code 不是成功码，即使 HTTP 状态是 200，也按 API 错误处理。
 */
export function responseSuccessInterceptor(response: AxiosResponse): any {
  const body = response.data as ApiResponse | undefined;

  if (!body || typeof body.code !== 'number') {
    return response.data;
  }

  if (body.code < 200 || body.code >= 300) {
    throw new ApiError(body.message || '请求失败', body.code, body);
  }

  return body.data;
}

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
    if (shouldRecoverSession(error)) {
      // Token 失效时自动重新识别 Windows 用户，避免界面长期停留在 checking。
      void useAuthStore.getState().recoverSession();
    }
    throw new AuthError('认证失败，请重新登录', status);
  }
  
  // 其他 HTTP 错误
  const responseData = response.data as ApiResponse | undefined;
  const errorMessage = responseData?.message || `请求失败 (${status})`;
  
  throw new ApiError(errorMessage, status, response.data);
}
