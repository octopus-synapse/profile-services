/**
 * Internal Auth Guard — protects internal MEC sync endpoints with the
 * `INTERNAL_API_TOKEN` environment secret. Comparison is timing-safe to
 * keep brute force attacks honest.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigPort } from '@/shared-kernel/config';
import {
  InternalAuthNotConfiguredException,
  InternalTokenInvalidException,
  InternalTokenMissingException,
} from '../../../domain/exceptions/integration.exceptions';

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly internalToken: string | undefined;

  constructor(private readonly configService: ConfigPort) {
    this.internalToken = this.configService.get<string>('INTERNAL_API_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.internalToken) {
      throw new InternalAuthNotConfiguredException();
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const providedToken = request.headers[INTERNAL_TOKEN_HEADER] as string | undefined;

    if (!providedToken) {
      throw new InternalTokenMissingException(INTERNAL_TOKEN_HEADER);
    }

    if (!this.timingSafeEqual(providedToken, this.internalToken)) {
      throw new InternalTokenInvalidException();
    }

    return true;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
