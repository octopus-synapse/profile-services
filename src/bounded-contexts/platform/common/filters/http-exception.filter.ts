/**
 * Global Exception Filter
 * Centralizes error logging and response transformation
 * Follows ERROR_HANDLING_STRATEGY.md principles
 *
 * Also handles ValidationError from profile-contracts,
 * converting them to HTTP 400 responses.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';
import { ERROR_CODES } from '@/shared-kernel';

/**
 * Interface matching ValidationError from profile-contracts
 */
interface ValidationError extends Error {
  name: 'ValidationError';
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
}

/**
 * Type guard for ValidationError from profile-contracts
 */
function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof Error &&
    error.name === 'ValidationError' &&
    'errors' in error &&
    Array.isArray((error as ValidationError).errors)
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // Only handle HTTP context
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle ValidationError from profile-contracts
    if (isValidationError(exception)) {
      const status = HttpStatus.BAD_REQUEST;
      const details = {
        errors: exception.errors,
        path: request.url,
        method: request.method,
      };

      this.logException(exception, request, status);

      return response.status(status).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details,
        },
      });
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const apiErrorResponse = this.toApiErrorResponse(
      exception,
      request,
      status,
    );

    // Centralized logging based on severity
    this.logException(exception, request, status);

    response.status(status).json(apiErrorResponse);
  }

  private toApiErrorResponse(
    exception: unknown,
    request: Request,
    status: number,
  ): {
    success: false;
    error: { code: string; message: string; details?: Record<string, unknown> };
  } {
    // Default values
    let code: string = this.statusToDefaultCode(status);
    let message = this.statusToDefaultMessage(status);
    let details: Record<string, unknown> | undefined = {
      path: request.url,
      method: request.method,
    };

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else {
        const payload = response as Record<string, unknown>;

        // Allow explicitly provided contract shape to pass through
        if (
          payload.success === false &&
          typeof payload.error === 'object' &&
          payload.error !== null
        ) {
          const errorObj = payload.error as Record<string, unknown>;
          return {
            success: false,
            error: {
              code: typeof errorObj.code === 'string' ? errorObj.code : code,
              message:
                typeof errorObj.message === 'string'
                  ? errorObj.message
                  : message,
              details:
                typeof errorObj.details === 'object' &&
                errorObj.details !== null
                  ? (errorObj.details as Record<string, unknown>)
                  : undefined,
            },
          };
        }

        // Common NestJS shape: { statusCode, message, error }
        const payloadMessage = payload.message;
        if (typeof payloadMessage === 'string') {
          message = payloadMessage;
        } else if (Array.isArray(payloadMessage)) {
          // Nest can return string[] for validation errors
          message =
            payloadMessage.filter((m) => typeof m === 'string').join(', ') ||
            message;
        }

        // Support custom "code" field if provided
        if (typeof payload.code === 'string') {
          code = payload.code;
        }

        // Preserve any useful payload bits without leaking internals
        const extraDetails: Record<string, unknown> = {};
        if (payload.errors !== undefined) extraDetails.errors = payload.errors;
        if (payload.error !== undefined && typeof payload.error === 'string') {
          extraDetails.nestError = payload.error;
        }

        details = { ...details, ...extraDetails };
      }
    } else if (exception instanceof Error) {
      // Keep message generic for 500s; preserve the original message for 4xx
      if (status < 500) {
        message = exception.message;
      }
    }

    if (status >= 500) {
      // Avoid leaking internal messages
      message = 'Internal server error';
    }

    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }

  private statusToDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST as number:
        return ERROR_CODES.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED as number:
        return ERROR_CODES.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN as number:
        return ERROR_CODES.FORBIDDEN;
      case HttpStatus.NOT_FOUND as number:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.CONFLICT as number:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.INTERNAL_SERVER_ERROR as number:
        return ERROR_CODES.INTERNAL_ERROR;
      default:
        return ERROR_CODES.UNKNOWN;
    }
  }

  private statusToDefaultMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST as number:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED as number:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN as number:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND as number:
        return 'Not found';
      case HttpStatus.CONFLICT as number:
        return 'Conflict';
      default:
        return 'Internal server error';
    }
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
