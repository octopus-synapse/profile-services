/**
 * Nest-side wrapper around the framework-free `mapDomainErrorToHttp`.
 * The mapping logic itself lives in `src/shared-kernel/http/error-mapper.ts`
 * so adapters that aren't Nest can call it without touching
 * `@nestjs/common`. This filter is responsible only for adapting the
 * Nest exception-handling contract to that pure function.
 */

import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import { DomainException } from '../exceptions/domain.exceptions';
import { mapDomainErrorToHttp } from '../http/error-mapper';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly i18n: TranslationPort) {}

  catch(exception: DomainException, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ headers: Record<string, string | string[] | undefined> }>();

    const mapped = mapDomainErrorToHttp(exception, this.i18n, request.headers['accept-language']);
    if (!mapped) {
      throw exception;
    }

    if (mapped.body.error === 'INTERNAL_TRANSLATION_MISSING') {
      this.logger.error(
        `Missing i18n catalog entry — returning 500. Catalog parity test should have blocked this at PR time.`,
      );
    }

    for (const [key, value] of Object.entries(mapped.headers)) {
      response.setHeader(key, value);
    }
    response.status(mapped.status).json(mapped.body);
  }
}
