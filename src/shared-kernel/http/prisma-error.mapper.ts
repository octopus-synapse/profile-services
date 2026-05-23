import { Prisma } from '@prisma/client';
import type { ErrorEnvelope } from '@/bounded-contexts/platform/i18n/domain/error-envelope';
import type { MappedHttpError } from './error.mapper';

const PRISMA_CODE_TO_STATUS: Record<string, number> = {
  P2002: 409,
  P2003: 400,
  P2025: 404,
};

const PRISMA_CODE_TO_DOMAIN_CODE: Record<string, string> = {
  P2002: 'CONFLICT_UNIQUE_CONSTRAINT',
  P2003: 'INVALID_FOREIGN_KEY',
  P2025: 'ENTITY_NOT_FOUND',
};

export function mapPrismaErrorToHttp(error: unknown): MappedHttpError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status = PRISMA_CODE_TO_STATUS[error.code];
    if (!status) return null;
    const domainCode = PRISMA_CODE_TO_DOMAIN_CODE[error.code] ?? 'PERSISTENCE_ERROR';
    // Prisma puts the offending column/constraint under different
    // `meta` keys depending on the error code — `target` for P2002
    // (unique constraint), `field_name`/`constraint` for P2003 (FK),
    // `cause`/`modelName` for P2025 (record not found). The mapper
    // used to read `target` only, which meant FK failures dropped
    // through with a bare `INVALID_FOREIGN_KEY` — no column, no
    // table, undebuggable from the client.
    const meta = (error.meta ?? {}) as {
      target?: readonly string[] | string;
      field_name?: string;
      constraint?: string;
      cause?: string;
      modelName?: string;
    };
    const rawTarget = meta.target ?? meta.field_name ?? meta.constraint ?? meta.cause;
    let targetStr: string | null;
    if (Array.isArray(rawTarget)) targetStr = rawTarget.join(', ');
    else if (typeof rawTarget === 'string') targetStr = rawTarget;
    else targetStr = null;
    const body: ErrorEnvelope = {
      statusCode: status,
      code: domainCode,
      message: targetStr ? `${domainCode} on ${targetStr}` : domainCode,
      severity: 'toast',
      params: targetStr ? { target: targetStr } : {},
    };
    return { status, headers: {}, body };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const body: ErrorEnvelope = {
      statusCode: 400,
      code: 'INVALID_PERSISTENCE_INPUT',
      message: 'INVALID_PERSISTENCE_INPUT',
      severity: 'toast',
      params: {},
    };
    return { status: 400, headers: {}, body };
  }

  return null;
}
