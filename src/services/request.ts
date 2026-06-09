/**
 * HTTP 请求封装模块
 * 
 * 基于 Axios 封装的 HTTP 客户端，为 UniComm Desktop 提供统一的 API 请求能力。
 * 
 * ## 核心功能
 * - **请求拦截器**: 自动为每个请求添加 `Authorization: Bearer <token>` 头
 * - **响应拦截器**: 统一处理 401/403 错误，自动恢复桌面会话
 * - **基础配置**: 预配置 baseURL、超时时间等默认参数
 * 
 * ## 认证流程
 * 1. 组件通过 `useAuthStore()` 获取当前用户的 `accessToken`
 * 2. 请求拦截器在发送请求前自动注入 Authorization 头
 * 3. 若响应返回 401/403，拦截器调用 `recoverSession()` 重新识别 Windows 用户
 * 4. 组件根据恢复结果进入工作区或展示认证失败状态
 * 
 * ## 使用示例
 * ```typescript
 * import request from '@/services/request';
 * 
 * // 发送需要认证的请求
 * const response = await request.get('/user/profile');
 * 
 * // 请求会自动携带 Authorization 头
 * // 若 token 过期，响应拦截器会清除会话并抛出错误
 * ```
 * 
 * @module services/request
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";

/** API 服务的基础地址，指向本地开发服务器 */
const BASE_URL = "http://localhost:28080/api/v1";

/**
 * Axios 实例，预配置了拦截器和默认参数
 * 
 * 配置项:
 * - baseURL: API 基础路径
 * - timeout: 15秒请求超时
 * - 请求拦截器: 自动注入 Bearer Token
 * - 响应拦截器: 处理 401/403 认证错误
 */
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/**
 * 旧版请求封装仍被部分历史模块使用，因此这里也保持与 core/http 一致的恢复逻辑。
 * 认证接口本身失败时不触发恢复，避免递归调用。
 */
function shouldRecoverSession(error: AxiosError): boolean {
  const url = error.config?.url || '';
  return !url.includes('/auth/desktop/verify');
}

/**
 * 请求拦截器
 * 
 * 在每个请求发送前执行，从 authStore 获取 accessToken 并注入到 Authorization 头。
 * 若无 token（用户未登录或会话已过期），请求会以匿名身份发送。
 * 
 * @param config - Axios 请求配置对象
 * @returns 修改后的配置（添加了 Authorization 头）
 */
request.interceptors.request.use(
  (config) => {
    // 从 Zustand store 获取当前 token
    const token = useAuthStore.getState().accessToken;
    if (token) {
      // 注入 Bearer Token 供后端验证
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器
 * 
 * 统一处理所有 API 响应错误：
 * - **401 Unauthorized**: token 无效或已过期
 * - **403 Forbidden**: 当前用户无权访问该资源
 * 
 * 检测到这两种状态时，调用 `recoverSession()` 清除旧 Session 并重新验证
 * 当前 Windows 用户，避免启动时停留在 checking 状态。
 * 
 * @param error - Axios 错误对象，包含 response 状态码
 * @returns 始终抛出错误，允许调用方通过 catch 处理
 */
request.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (shouldRecoverSession(error)) {
        // Token 失效时自动重新识别 Windows 用户。
        void useAuthStore.getState().recoverSession();
      }
    }
    return Promise.reject(error);
  }
);

export default request;
