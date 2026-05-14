/**
 * 统一 API Response 类型定义
 * 
 * 后端返回格式：
 * {
 *   code: number;      // 200=成功, 4xx=客户端错误, 5xx=服务端错误
 *   message: string;   // "success" 或错误消息
 *   data: T | null;   // 响应数据，成功时有值
 * }
 * 
 * @module core/http/types
 */

/**
 * 统一 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/**
 * API 错误响应（后端返回错误格式）
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  data?: null;
}

/**
 * 分页响应
 */
export interface PagedResponse<T> {
  code: number;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * 判断是否为成功响应
 */
export function isSuccess<T>(response: ApiResponse<T>): boolean {
  return response.code >= 200 && response.code < 300;
}