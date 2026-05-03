/**
 * Zod issue → stable message code.
 *
 * Exhaustively maps every ZodIssueCode shape we emit into a backend-owned
 * code that lives in the i18n catalog. The mapping is a source-of-truth
 * shared with the frontend (via the code in ErrorEnvelope.fields) — both
 * sides render the same translation.
 *
 * Unknown shapes fall through to VALIDATION_GENERIC — that's a crash-ish
 * signal: every custom refinement that the mapper doesn't recognise ends
 * up generic, surfacing "this rule needs an explicit code" to the author.
 */

import type { ZodIssue, ZodIssueCode } from 'zod';
import type { TranslationParams } from '../domain/translation.port';

export interface ConvertedIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly code: string;
  readonly params: TranslationParams;
}

export function zodIssueToCode(issue: ZodIssue): ConvertedIssue {
  const base: Pick<ConvertedIssue, 'path'> = { path: issue.path };
  const { code } = issue as { code: ZodIssueCode };

  switch (code) {
    case 'invalid_type': {
      const expected = (issue as { expected?: string }).expected ?? 'unknown';
      return {
        ...base,
        code: typeToCode(expected),
        params: { expected },
      };
    }

    case 'too_small': {
      const i = issue as {
        type: 'string' | 'number' | 'array' | 'set' | 'date' | 'bigint';
        minimum: number | bigint;
        inclusive?: boolean;
      };
      const minimum = Number(i.minimum);
      if (i.type === 'string') {
        if (minimum === 1) return { ...base, code: 'REQUIRED', params: {} };
        return { ...base, code: 'STRING_TOO_SHORT', params: { min: minimum } };
      }
      if (i.type === 'array' || i.type === 'set') {
        if (minimum === 1) return { ...base, code: 'ARRAY_REQUIRED', params: {} };
        return { ...base, code: 'ARRAY_TOO_SHORT', params: { min: minimum } };
      }
      if (i.type === 'number')
        return { ...base, code: 'NUMBER_TOO_SMALL', params: { min: minimum } };
      if (i.type === 'date') return { ...base, code: 'DATE_TOO_EARLY', params: { min: minimum } };
      return { ...base, code: 'VALUE_TOO_SMALL', params: { min: minimum } };
    }

    case 'too_big': {
      const i = issue as {
        type: 'string' | 'number' | 'array' | 'set' | 'date' | 'bigint';
        maximum: number | bigint;
      };
      const maximum = Number(i.maximum);
      if (i.type === 'string')
        return { ...base, code: 'STRING_TOO_LONG', params: { max: maximum } };
      if (i.type === 'array' || i.type === 'set')
        return { ...base, code: 'ARRAY_TOO_LONG', params: { max: maximum } };
      if (i.type === 'number')
        return { ...base, code: 'NUMBER_TOO_LARGE', params: { max: maximum } };
      if (i.type === 'date') return { ...base, code: 'DATE_TOO_LATE', params: { max: maximum } };
      return { ...base, code: 'VALUE_TOO_LARGE', params: { max: maximum } };
    }

    case 'invalid_string': {
      const validation = (issue as { validation?: string }).validation;
      switch (validation) {
        case 'email':
          return { ...base, code: 'EMAIL_INVALID', params: {} };
        case 'url':
          return { ...base, code: 'URL_INVALID', params: {} };
        case 'uuid':
          return { ...base, code: 'UUID_INVALID', params: {} };
        case 'cuid':
        case 'cuid2':
          return { ...base, code: 'CUID_INVALID', params: {} };
        case 'datetime':
          return { ...base, code: 'DATETIME_INVALID', params: {} };
        case 'regex':
          return { ...base, code: 'PATTERN_MISMATCH', params: {} };
        case 'emoji':
          return { ...base, code: 'EMOJI_INVALID', params: {} };
        default:
          return {
            ...base,
            code: 'STRING_INVALID',
            params: { validation: validation ?? 'unknown' },
          };
      }
    }

    case 'invalid_enum_value': {
      const options = (issue as { options?: unknown[] }).options ?? [];
      return {
        ...base,
        code: 'ENUM_INVALID',
        params: { allowed: options.map((o) => String(o)).join(', ') },
      };
    }

    case 'invalid_literal':
      return { ...base, code: 'LITERAL_INVALID', params: {} };

    case 'unrecognized_keys': {
      const keys = (issue as { keys?: string[] }).keys ?? [];
      return { ...base, code: 'UNRECOGNIZED_KEYS', params: { keys: keys.join(', ') } };
    }

    case 'invalid_union':
    case 'invalid_union_discriminator':
      return { ...base, code: 'UNION_INVALID', params: {} };

    case 'invalid_arguments':
    case 'invalid_return_type':
      return { ...base, code: 'FUNCTION_SIGNATURE_INVALID', params: {} };

    case 'invalid_date':
      return { ...base, code: 'DATE_INVALID', params: {} };

    case 'not_multiple_of':
      return {
        ...base,
        code: 'NUMBER_NOT_MULTIPLE_OF',
        params: { multipleOf: Number((issue as { multipleOf?: number }).multipleOf ?? 0) },
      };

    case 'not_finite':
      return { ...base, code: 'NUMBER_NOT_FINITE', params: {} };

    case 'custom': {
      // Custom refinements MUST carry a stable code in `params` so they
      // translate without ambiguity. If they don't, VALIDATION_GENERIC
      // surfaces the refinement author's oversight loudly.
      const params = (issue as { params?: Record<string, unknown> }).params ?? {};
      const customCode = typeof params.code === 'string' ? params.code : undefined;
      if (customCode) {
        return {
          ...base,
          code: customCode,
          params: Object.fromEntries(
            Object.entries(params).filter(([k]) => k !== 'code'),
          ) as TranslationParams,
        };
      }
      return { ...base, code: 'VALIDATION_GENERIC', params: {} };
    }

    default:
      return { ...base, code: 'VALIDATION_GENERIC', params: {} };
  }
}

function typeToCode(expected: string): string {
  switch (expected) {
    case 'string':
      return 'MUST_BE_STRING';
    case 'number':
      return 'MUST_BE_NUMBER';
    case 'boolean':
      return 'MUST_BE_BOOLEAN';
    case 'array':
      return 'MUST_BE_ARRAY';
    case 'object':
      return 'MUST_BE_OBJECT';
    case 'date':
      return 'MUST_BE_DATE';
    case 'bigint':
      return 'MUST_BE_BIGINT';
    case 'undefined':
      return 'REQUIRED';
    default:
      return 'TYPE_MISMATCH';
  }
}
