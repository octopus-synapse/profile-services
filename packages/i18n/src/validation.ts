/**
 * Validation-message dictionary.
 *
 * One entry per code `zodIssueToCode` can emit (request-body validation
 * failures → 400 `fields[]`) plus the custom refinement codes declared in
 * `src/shared-kernel/schemas/**` via `params: { code: 'X' }`. The
 * `i18n-validation-parity` arch test enforces both-locale coverage and no
 * orphans, and a spec keeps this key-set disjoint from `ERROR_DICTIONARY`.
 *
 * Messages are deliberately field-agnostic ("Mínimo de 2 caracteres", not
 * "O nome deve ter…"): the frontend renders them directly under the input,
 * so the field is implicit — and pt-BR gender/number agreement never leaks
 * into a template. Placeholders use `{name}` syntax.
 */

import type { LocalizedDictionary } from './types';

export type ValidationCode = keyof typeof VALIDATION_DICTIONARY;

export const VALIDATION_DICTIONARY = {
  // ── Presence / length ──
  REQUIRED: { en: 'This field is required', 'pt-BR': 'Campo obrigatório' },
  STRING_TOO_SHORT: { en: 'Minimum of {min} characters', 'pt-BR': 'Mínimo de {min} caracteres' },
  STRING_TOO_LONG: { en: 'Maximum of {max} characters', 'pt-BR': 'Máximo de {max} caracteres' },
  ARRAY_REQUIRED: { en: 'Select at least one item', 'pt-BR': 'Selecione ao menos um item' },
  ARRAY_TOO_SHORT: { en: 'Select at least {min} items', 'pt-BR': 'Selecione ao menos {min} itens' },
  ARRAY_TOO_LONG: { en: 'Select at most {max} items', 'pt-BR': 'Selecione no máximo {max} itens' },
  NUMBER_TOO_SMALL: { en: 'Must be at least {min}', 'pt-BR': 'Deve ser no mínimo {min}' },
  NUMBER_TOO_LARGE: { en: 'Must be at most {max}', 'pt-BR': 'Deve ser no máximo {max}' },
  DATE_TOO_EARLY: { en: 'Date is too early', 'pt-BR': 'Data muito antiga' },
  DATE_TOO_LATE: { en: 'Date is too late', 'pt-BR': 'Data muito distante' },
  VALUE_TOO_SMALL: { en: 'Value is too small', 'pt-BR': 'Valor muito pequeno' },
  VALUE_TOO_LARGE: { en: 'Value is too large', 'pt-BR': 'Valor muito grande' },

  // ── String formats ──
  EMAIL_INVALID: { en: 'Enter a valid e-mail', 'pt-BR': 'E-mail inválido' },
  URL_INVALID: { en: 'Enter a valid URL', 'pt-BR': 'Informe uma URL válida' },
  UUID_INVALID: { en: 'Invalid identifier', 'pt-BR': 'Identificador inválido' },
  CUID_INVALID: { en: 'Invalid identifier', 'pt-BR': 'Identificador inválido' },
  DATETIME_INVALID: { en: 'Invalid date/time', 'pt-BR': 'Data/hora inválida' },
  PATTERN_MISMATCH: { en: 'Invalid format', 'pt-BR': 'Formato inválido' },
  EMOJI_INVALID: { en: 'Must be an emoji', 'pt-BR': 'Deve ser um emoji' },
  STRING_INVALID: { en: 'Invalid value', 'pt-BR': 'Valor inválido' },

  // ── Structure ──
  ENUM_INVALID: { en: 'Must be one of: {allowed}', 'pt-BR': 'Deve ser um de: {allowed}' },
  LITERAL_INVALID: { en: 'Unexpected value', 'pt-BR': 'Valor inesperado' },
  UNRECOGNIZED_KEYS: { en: 'Unexpected fields: {keys}', 'pt-BR': 'Campos inesperados: {keys}' },
  UNION_INVALID: {
    en: 'Value does not match any accepted shape',
    'pt-BR': 'Valor não corresponde a nenhum formato aceito',
  },
  FUNCTION_SIGNATURE_INVALID: { en: 'Invalid arguments', 'pt-BR': 'Argumentos inválidos' },
  DATE_INVALID: { en: 'Invalid date', 'pt-BR': 'Data inválida' },
  NUMBER_NOT_MULTIPLE_OF: {
    en: 'Must be a multiple of {multipleOf}',
    'pt-BR': 'Deve ser múltiplo de {multipleOf}',
  },
  NUMBER_NOT_FINITE: { en: 'Must be a finite number', 'pt-BR': 'Deve ser um número finito' },

  // ── Type mismatches ──
  MUST_BE_STRING: { en: 'Must be text', 'pt-BR': 'Deve ser um texto' },
  MUST_BE_NUMBER: { en: 'Must be a number', 'pt-BR': 'Deve ser um número' },
  MUST_BE_BOOLEAN: { en: 'Must be true or false', 'pt-BR': 'Deve ser verdadeiro ou falso' },
  MUST_BE_ARRAY: { en: 'Must be a list', 'pt-BR': 'Deve ser uma lista' },
  MUST_BE_OBJECT: { en: 'Must be an object', 'pt-BR': 'Deve ser um objeto' },
  MUST_BE_DATE: { en: 'Must be a date', 'pt-BR': 'Deve ser uma data' },
  MUST_BE_BIGINT: { en: 'Must be an integer', 'pt-BR': 'Deve ser um inteiro' },
  TYPE_MISMATCH: { en: 'Unexpected type', 'pt-BR': 'Tipo inesperado' },
  VALIDATION_GENERIC: { en: 'Invalid value', 'pt-BR': 'Valor inválido' },

  // ── Password policy (custom refinements in password.schema.ts) ──
  PASSWORD_NEEDS_UPPERCASE: {
    en: 'Add at least one uppercase letter',
    'pt-BR': 'Inclua ao menos uma letra maiúscula',
  },
  PASSWORD_NEEDS_LOWERCASE: {
    en: 'Add at least one lowercase letter',
    'pt-BR': 'Inclua ao menos uma letra minúscula',
  },
  PASSWORD_NEEDS_DIGIT: { en: 'Add at least one number', 'pt-BR': 'Inclua ao menos um número' },
  PASSWORD_NEEDS_SYMBOL: {
    en: 'Add at least one symbol ({chars})',
    'pt-BR': 'Inclua ao menos um símbolo ({chars})',
  },
} as const satisfies LocalizedDictionary;
