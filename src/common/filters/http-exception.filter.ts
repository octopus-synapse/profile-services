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

    const log = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      response: message,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    this.logger.error(
      'Unhandled Exception',
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
      'ExceptionFilter',
      log,
    );

    response.status(status).json(message);
  }
}
