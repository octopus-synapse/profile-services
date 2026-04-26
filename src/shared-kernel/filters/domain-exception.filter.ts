/**
 * DomainExceptionFilter
 *
 * Catches every `DomainException` subclass and serializes it into the
 * canonical `ErrorEnvelope`:
 *   { statusCode, error: CODE, message: <translated>, params?: { ... } }
 *
 * Translation is resolved from `I18nService` using the `Accept-Language`
 * header (RFC 7231 negotiation). Supported locales: pt-BR, en.
 *
 * Missing translation policy: throw `MissingTranslationError`, which the
 * filter converts to a 500/INTERNAL_TRANSLATION_MISSING envelope. The
 * catalog-parity architecture test is the PR-time guarantee this never
 * fires in production.
 *
 * Subclass params: any own-enumerable public field on the exception
 * instance is auto-extracted as a translation param. Framework-owned
 * fields (`code`, `statusHint`, `message`, `name`, `stack`, `cause`)
 * are excluded.
 */

import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import type { ErrorEnvelope } from '@/bounded-contexts/platform/i18n/domain/error-envelope';
import {
  MissingTranslationError,
  type TranslationParams,
  TranslationPort,
} from '@/bounded-contexts/platform/i18n/domain/translation.port';
import { DomainException } from '../exceptions/domain.exceptions';

const FRAMEWORK_FIELDS = new Set(['code', 'statusHint', 'message', 'name', 'stack', 'cause']);

function extractParams(exception: DomainException): TranslationParams {
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of Object.keys(exception)) {
    if (FRAMEWORK_FIELDS.has(key)) continue;
    const value = (exception as unknown as Record<string, unknown>)[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.join(', ');
    }
    // Skip objects / functions — translation params are flat.
  }
  return out;
}

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly i18n: TranslationPort) {}

  catch(exception: DomainException, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ headers: Record<string, string | string[] | undefined> }>();

    const acceptLanguage = request.headers['accept-language'];
    const negotiated = negotiateLocale(
      Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage,
    );
    const locale = negotiated.locale;

    const params = extractParams(exception);
    const status = exception.statusHint;

    let message: string;
    try {
      message = this.i18n.translate(exception.code, params, locale);
    } catch (err) {
      if (err instanceof MissingTranslationError) {
        this.logger.error(
          `Missing i18n catalog entry for code "${exception.code}" in locale "${locale}" — ` +
            `returning 500/INTERNAL_TRANSLATION_MISSING. Catalog parity test should have blocked this at PR time.`,
        );
        const envelope: ErrorEnvelope = {
          statusCode: 500,
          error: 'INTERNAL_TRANSLATION_MISSING',
          message: `Missing translation for "${exception.code}" in "${locale}"`,
          params: { code: exception.code, locale },
        };
        response.setHeader('Content-Language', locale);
        response.status(500).json({ success: false, ...envelope });
        return;
      }
      throw err;
    }

    const envelope: ErrorEnvelope = { statusCode: status, error: exception.code, message, params };

    response.setHeader('Content-Language', locale);
    if (!negotiated.matched) response.setHeader('Vary', 'Accept-Language');
    response.status(status).json({ success: false, ...envelope });
  }
}
