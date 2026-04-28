import { describe, expect, it, mock } from 'bun:test';
import type { ArgumentsHost } from '@nestjs/common';
import { I18nService } from '@/bounded-contexts/platform/i18n/application/i18n.service';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  ConflictException,
  DomainException,
  EntityNotFoundException,
} from '../exceptions/domain.exceptions';
import { DomainExceptionFilter } from './domain-exception.filter';

function mockHost(acceptLanguage?: string): {
  host: ArgumentsHost;
  status: ReturnType<typeof mock>;
  json: ReturnType<typeof mock>;
  setHeader: ReturnType<typeof mock>;
} {
  const json = mock(() => undefined);
  const status = mock(() => ({ json }));
  const setHeader = mock(() => undefined);
  const response = { status, setHeader };
  const request = {
    headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {},
  };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, status, json, setHeader };
}

describe('DomainExceptionFilter', () => {
  const i18n = new I18nService(stubLogger);

  it('emits canonical envelope with translated message and params for EntityNotFound', () => {
    const filter = new DomainExceptionFilter(i18n);
    const { host, status, json, setHeader } = mockHost('en');
    const exception = new EntityNotFoundException('User', 'abc-123');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0] as {
      success: boolean;
      statusCode: number;
      error: string;
      message: string;
      params: Record<string, unknown>;
    };
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('ENTITY_NOT_FOUND');
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.params.entityType).toBe('User');
    expect(body.params.identifier).toBe('abc-123');
    expect(setHeader).toHaveBeenCalledWith('Content-Language', 'en');
  });

  it('negotiates pt-BR from Accept-Language header', () => {
    const filter = new DomainExceptionFilter(i18n);
    const { host, setHeader } = mockHost('pt-BR,en;q=0.8');
    filter.catch(new ConflictException('already done'), host);
    expect(setHeader).toHaveBeenCalledWith('Content-Language', 'pt-BR');
  });

  it('falls back to default locale and sets Vary header when Accept-Language is unsupported', () => {
    const filter = new DomainExceptionFilter(i18n);
    const { host, setHeader } = mockHost('fr-FR');
    filter.catch(new ConflictException('test'), host);
    const headerCalls = setHeader.mock.calls.map((c) => c[0]);
    expect(headerCalls).toContain('Vary');
  });

  it('returns 500 INTERNAL_TRANSLATION_MISSING when code is absent from catalog', () => {
    class UncatalogedException extends DomainException {
      readonly code = 'TOTALLY_NOT_IN_CATALOG_ZZZ';
      readonly statusHint = 418;
      constructor() {
        super('teapot');
      }
    }
    const filter = new DomainExceptionFilter(i18n);
    const { host, status, json } = mockHost('en');
    filter.catch(new UncatalogedException(), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0] as { error: string; statusCode: number };
    expect(body.error).toBe('INTERNAL_TRANSLATION_MISSING');
    expect(body.statusCode).toBe(500);
  });
});
