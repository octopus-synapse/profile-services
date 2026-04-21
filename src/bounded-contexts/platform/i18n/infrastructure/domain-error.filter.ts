/**
 * DomainErrorFilter
 *
 * Serializes DomainError into the canonical ErrorEnvelope. Phase 2 ships
 * with message = humanFallback (english) — phase 3 will replace that with
 * the translated string via I18nService once the catalog lands.
 *
 * Deliberately narrow @Catch so the legacy AllExceptionsFilter keeps
 * handling HttpException, Nest exceptions, and unknown errors. Callers
 * migrate to DomainError at their own pace.
 */

import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { negotiateLocale } from '../application/locale-negotiator';
import { DomainError } from '../domain/domain-error';
import type { ErrorEnvelope, FieldError } from '../domain/error-envelope';
import { DEFAULT_LOCALE, type SupportedLocale } from '../domain/translation.port';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ headers: Record<string, string | string[] | undefined> }>();

    const acceptLanguage = request.headers['accept-language'];
    const negotiated = negotiateLocale(
      Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage,
    );

    const locale: SupportedLocale = negotiated.locale;

    // Phase 2: no catalog loaded, so message = humanFallback. The message
    // MUST still be stable enough for a human to read in a log. Phase 3
    // swaps this call for I18nService.translate(exception.code, exception.params, locale).
    const message = exception.message || exception.code;

    const fields: FieldError[] | undefined = exception.fields?.map((field) => ({
      path: field.path,
      code: field.code,
      params: field.params ?? {},
      message: field.code, // phase 2 placeholder
    }));

    const envelope: ErrorEnvelope = {
      statusCode: exception.status,
      error: exception.code,
      message,
      params: exception.params,
      ...(fields ? { fields } : {}),
    };

    response.setHeader('Content-Language', locale);
    if (!negotiated.matched) {
      response.setHeader('Vary', 'Accept-Language');
    }

    // Structured log — code + params are the index, message is diagnostic.
    this.logger.warn(
      `DomainError ${exception.code} (status=${exception.status}) params=${JSON.stringify(exception.params)}`,
    );

    response.status(exception.status).json({ success: false, ...envelope });
    return;
  }
}

export { DEFAULT_LOCALE as DEFAULT_LOCALE_FALLBACK };
