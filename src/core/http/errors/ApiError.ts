/**
 * API 错误
 * 
 * 当后端返回错误响应时抛出。
 * 
 * @module core/http/errors
 */
import { AppError } from './AppError';

export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    public readonly response?: unknown
  ) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'ApiError';
  }
}