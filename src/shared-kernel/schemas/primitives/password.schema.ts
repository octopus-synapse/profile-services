import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_PASSWORD } from '../params/example-values.const';

extendZodWithOpenApi(z);

/**
 * Password Policy Configuration
 *
 * Single source of truth for password requirements.
 * Both frontend and backend reference these constants.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '@$!%*?&',
} as const;

const escapeForCharClass = (chars: string): string => chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SPECIAL_CHAR_RE = new RegExp(`[${escapeForCharClass(PASSWORD_POLICY.specialChars)}]`);

/**
 * Password character-class rules — the ONE list both the Zod schema
 * (request validation → 400 `fields[]`) and the `Password` value object
 * (domain invariant → PASSWORD_WEAK) iterate. Each rule carries the
 * `VALIDATION_DICTIONARY` code it emits, so the user sees the same
 * localized sentence whichever path rejected the password.
 */
export interface PasswordRule {
  readonly code: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly test: (password: string) => boolean;
}

export const PASSWORD_RULES: ReadonlyArray<PasswordRule> = [
  { code: 'PASSWORD_NEEDS_UPPERCASE', params: {}, test: (p) => /[A-Z]/.test(p) },
  { code: 'PASSWORD_NEEDS_LOWERCASE', params: {}, test: (p) => /[a-z]/.test(p) },
  { code: 'PASSWORD_NEEDS_DIGIT', params: {}, test: (p) => /[0-9]/.test(p) },
  {
    code: 'PASSWORD_NEEDS_SYMBOL',
    params: { chars: PASSWORD_POLICY.specialChars },
    test: (p) => SPECIAL_CHAR_RE.test(p),
  },
];

/**
 * Password Validation Messages (English defaults carried on the Zod
 * issue). The wire response never shows these: `zodIssueToCode` maps
 * the issue to its dictionary code and the mounter localizes it.
 */
export const PASSWORD_MESSAGES = {
  minLength: `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  maxLength: `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`,
  requireUppercase: 'Password must contain at least one uppercase letter',
  requireLowercase: 'Password must contain at least one lowercase letter',
  requireNumber: 'Password must contain at least one number',
  requireSpecialChar: `Password must contain at least one special character (${PASSWORD_POLICY.specialChars})`,
} as const;

/**
 * Combined regex enforcing all four character-class requirements of
 * `PASSWORD_POLICY` in a single pattern. We keep the per-rule `.regex()`
 * calls below for granular validation messages on the backend, and use
 * this combined pattern in the OpenAPI envelope so the wire contract
 * (and any client SDK derived from it via kubb) communicates the full
 * policy — OpenAPI only allows one `pattern` per field.
 */
const PASSWORD_COMBINED_PATTERN = `^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[${escapeForCharClass(PASSWORD_POLICY.specialChars)}]).{${PASSWORD_POLICY.minLength},${PASSWORD_POLICY.maxLength}}$`;

const PASSWORD_DESCRIPTION = `Password (${PASSWORD_POLICY.minLength}-${PASSWORD_POLICY.maxLength} chars). Must contain at least one uppercase letter, one lowercase letter, one number, and one special character (${PASSWORD_POLICY.specialChars}).`;

/**
 * Password Schema
 *
 * Strict validation for new passwords (registration, password change).
 */
const RULE_MESSAGE: Record<string, string> = {
  PASSWORD_NEEDS_UPPERCASE: PASSWORD_MESSAGES.requireUppercase,
  PASSWORD_NEEDS_LOWERCASE: PASSWORD_MESSAGES.requireLowercase,
  PASSWORD_NEEDS_DIGIT: PASSWORD_MESSAGES.requireNumber,
  PASSWORD_NEEDS_SYMBOL: PASSWORD_MESSAGES.requireSpecialChar,
};

export const PasswordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, PASSWORD_MESSAGES.minLength)
  .max(PASSWORD_POLICY.maxLength, PASSWORD_MESSAGES.maxLength)
  // Character-class rules as custom issues carrying `params.code`, so
  // `zodIssueToCode` forwards the precise dictionary code instead of the
  // generic PATTERN_MISMATCH a `.regex()` would produce.
  .superRefine((password, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (rule.test(password)) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: RULE_MESSAGE[rule.code],
        params: { code: rule.code, ...rule.params },
      });
    }
  })
  .openapi('Password', {
    example: EXAMPLE_PASSWORD,
    description: PASSWORD_DESCRIPTION,
    pattern: PASSWORD_COMBINED_PATTERN,
  });

export type Password = z.infer<typeof PasswordSchema>;

/**
 * Password Input Schema
 *
 * Lenient validation for login (allows legacy passwords created before
 * stricter rules were enforced).
 */
export const PasswordInputSchema = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_POLICY.maxLength, PASSWORD_MESSAGES.maxLength)
  .openapi('PasswordInput', {
    example: EXAMPLE_PASSWORD,
    description: `Account password for authentication. Lenient validation (1-${PASSWORD_POLICY.maxLength} chars) to support legacy accounts; new passwords must satisfy the stricter PasswordSchema policy.`,
  });

export type PasswordInput = z.infer<typeof PasswordInputSchema>;

export type PasswordDto = z.infer<typeof PasswordSchema>;

export type PasswordInputDto = z.infer<typeof PasswordInputSchema>;
