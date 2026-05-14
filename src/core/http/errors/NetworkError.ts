/**
 * 网络错误
 * 
 * 当网络请求失败（超时、无网络等）时抛出。
 * 
 * @module core/http/errors
 */
import { AppError } from './AppError';

export class NetworkError extends AppError {
  constructor(message: string, public readonly networkCode?: string) {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}