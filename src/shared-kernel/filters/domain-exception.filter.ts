import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainException } from '../exceptions/domain.exceptions';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = (exception as { statusHint?: number }).statusHint ?? 500;

    response.status(status).json({
      success: false,
      statusCode: status,
      error: exception.code,
      message: exception.message,
    });
  }
}
