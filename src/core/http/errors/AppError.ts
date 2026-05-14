/**
 * 应用错误基类
 * 
 * 所有业务错误都继承此类，确保统一处理。
 * 
 * @module core/http/errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}