/**
 * Global Exception Filter
 * Centralizes error logging and response transformation
 * Follows ERROR_HANDLING_STRATEGY.md principles
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: status,
            message: 'Internal server error',
          };

    // Centralized logging based on severity
    this.logException(exception, request, status);

    response.status(status).json(message);
  }

  private logException(
    exception: unknown,
    request: Request,
    status: number,
  ): void {
    const context = 'AllExceptionsFilter';
    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    const metadata = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      userId: (request as { user?: { id?: string } }).user?.id,
      ip: request.ip,
    };

    // Log based on HTTP status severity
    if (status >= 500) {
      // Server errors - full stack trace
      this.logger.error(
        `Server Error: ${errorMessage}`,
        errorStack,
        context,
        metadata,
      );
    } else if (status >= 400) {
      // Client errors - warning level, no stack trace
      this.logger.warn(`Client Error: ${errorMessage}`, context, metadata);
    } else {
      // Successful responses logged at info level
      this.logger.log(`Request handled: ${errorMessage}`, context, metadata);
    }
  }
}
