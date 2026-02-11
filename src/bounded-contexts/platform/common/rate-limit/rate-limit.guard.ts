/**
 * Rate Limit Guard
 *
 * NestJS guard for granular rate limiting.
 * Applies rate limits based on endpoint metadata and user context.
 *
 * Kent Beck: "Guards protect invariants at boundaries"
 * Uncle Bob: "Guards are policy enforcement points"
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import type {
  RateLimitErrorPayload,
  RateLimitKeyStrategy,
  RateLimitOptions,
} from './rate-limit.types';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator for custom rate limit on specific endpoints
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface RequestWithUser extends Request {
  user?: { id: string };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    const isAuthenticated = !!request.user;
    const isAuthEndpoint = request.path.includes('/auth/');
    const isExpensiveOperation = this.isExpensiveEndpoint(request);

    // Get appropriate config - merge options with context defaults
    const contextConfig = this.rateLimitService.getContextConfig({
      isAuthenticated,
      isAuthEndpoint,
      isExpensiveOperation,
    });

    const config = options ? { ...contextConfig, ...options } : contextConfig;

    // Generate rate limit key
    const keyStrategy: RateLimitKeyStrategy =
      config.keyStrategy ?? (isAuthenticated ? 'user' : 'ip');

    const key = this.rateLimitService.generateKey({
      keyStrategy,
      ip: this.getClientIp(request),
      userId: request.user?.id,
      endpoint: `${request.method}:${request.path}`,
    });

    // Consume rate limit point
    const result = await this.rateLimitService.consume(key, config);

    // Set rate limit headers
    const headers = this.rateLimitService.getHeaders(result, config);
    response.setHeader('X-RateLimit-Limit', headers['X-RateLimit-Limit']);
    response.setHeader('X-RateLimit-Remaining', headers['X-RateLimit-Remaining']);
    response.setHeader('X-RateLimit-Reset', headers['X-RateLimit-Reset']);
    if (headers['Retry-After'] !== undefined) {
      response.setHeader('Retry-After', headers['Retry-After']);
    }

    // Block if rate limited
    if (result.isBlocked) {
      const errorPayload: RateLimitErrorPayload = {
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(result.msBeforeNext / 1000),
        limit: config.points,
        remaining: 0,
        resetAt: Math.floor((Date.now() + result.msBeforeNext) / 1000),
      };

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          ...errorPayload,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }

  private isExpensiveEndpoint(request: Request): boolean {
    const expensivePaths = ['/export/', '/import/', '/generate/'];
    return expensivePaths.some((path) => request.path.includes(path));
  }
}
