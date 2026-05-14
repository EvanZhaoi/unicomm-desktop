/**
 * HTTP 客户端配置
 * 
 * 基于 Axios 封装的统一 HTTP 客户端。
 * 
 * @module core/http
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { requestInterceptor } from './interceptors/request';
import { responseInterceptor } from './interceptors/response';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || 'http://localhost:28080/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * 创建 HTTP 客户端
 * 
 * @param config - 额外的 Axios 配置
 * @returns 配置好的 Axios 实例
 */
export function createClient(config?: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({ ...DEFAULT_CONFIG, ...config });
  
  // 添加拦截器
  client.interceptors.request.use(requestInterceptor);
  client.interceptors.response.use(
    (response) => response,
    responseInterceptor
  );
  
  return client;
}

/**
 * 默认客户端实例
 */
export const client = createClient();