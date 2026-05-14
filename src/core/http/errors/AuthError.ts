/**
 * 认证错误
 * 
 * 当 401/403 时抛出。
 * 
 * @module core/http/errors
 */
import { AppError } from './AppError';

export class AuthError extends AppError {
  constructor(message: string, public readonly statusCode: 401 | 403) {
    super(message, 'AUTH_ERROR', statusCode);
    this.name = 'AuthError';
  }
}