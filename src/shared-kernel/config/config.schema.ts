/**
 * Zod schema for environment configuration (P0-001).
 *
 * Boot fail-fast: `parseEnvConfig(process.env)` throws a structured
 * `ConfigValidationError` listing every missing/invalid variable when
 * the schema fails. Composition root catches it, prints the report,
 * and exits with status 1 before any port adapter is constructed.
 *
 * Strict-typing approach: variables that the codebase ALREADY treats
 * as critical (no sensible default) are required. Variables consumed
 * with a `getOrDefault(..., default)` semantic remain optional and
 * the adapter falls back to the per-call default. This keeps the PR
 * scope sane while still gating boot on truly load-bearing secrets.
 *
 * The schema mirrors `.env.example`. Adding a new env var:
 *   1. Add to `.env.example` with a comment block.
 *   2. Add to this schema with the right Zod constraint.
 *   3. Read via `ConfigPort.get/getOrDefault` (never `process.env` direct).
 */

import { z } from 'zod';

const NodeEnvSchema = z
  .enum(['development', 'production', 'test', 'staging'])
  .default('development');

const BooleanString = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1');

/**
 * Optional URL where the empty string is normalised to `undefined`.
 *
 * `.env` files frequently leave a placeholder line like
 * `MINIO_ENDPOINT=""` for variables that an environment intentionally
 * does not set. Plain `z.string().url().optional()` would reject the
 * empty string because the schema is "string-or-undefined", and ""
 * is a string that is not a valid URL.
 *
 * This preprocessor turns empty strings into `undefined` BEFORE the
 * URL validator runs, which is the conventional shell semantics
 * ("unset variable").
 */
const OptionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().url().optional(),
);

const PortNumber = z
  .string()
  .regex(/^\d+$/u, 'must be a positive integer')
  .transform((v) => parseInt(v, 10))
  .refine((n) => n >= 0 && n <= 65535, { message: 'port must be 0-65535' });

const PositiveIntString = z
  .string()
  .regex(/^\d+$/u, 'must be a non-negative integer')
  .transform((v) => parseInt(v, 10));

export const EnvConfigSchema = z
  .object({
    // --- Application ---
    NODE_ENV: NodeEnvSchema,
    PORT: PortNumber.optional(),

    // --- Database (PostgreSQL via Prisma) ---
    // DATABASE_URL is required everywhere — Prisma cannot run without it.
    DATABASE_URL: z.string().url('must be a postgresql:// URL'),
    POSTGRES_USER: z.string().optional(),
    POSTGRES_PASSWORD: z.string().optional(),
    POSTGRES_DB: z.string().optional(),
    POSTGRES_PORT: PortNumber.optional(),

    // --- Redis (cache + BullMQ) ---
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: PortNumber.optional(),
    REDIS_PASSWORD: z.string().optional(),
    ENABLE_BULLMQ: BooleanString.optional(),

    // --- JWT (REQUIRED — no defaults, P0-001) ---
    // Secret must be 32+ chars to leave at least 192 bits of entropy when
    // base64-encoded; weaker keys are rejected at boot.
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters; use a long random string'),
    // Optional previous secret kept valid for verification only (zero-downtime
    // rotation window). The verifier tries `JWT_SECRET` first; on signature
    // mismatch it falls back to `JWT_SECRET_PREVIOUS` if set. The signer
    // always uses `JWT_SECRET`. Drop the env var once all tokens issued with
    // the previous secret have expired.
    JWT_SECRET_PREVIOUS: z
      .string()
      .min(32, 'JWT_SECRET_PREVIOUS must be at least 32 characters if set')
      .optional(),
    JWT_EXPIRATION: z.string().optional(),
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    AUTH_COOKIE_NAME: z.string().optional(),

    // --- Symmetric encryption for stored secrets (P0-007 — OAuth tokens) ---
    // 32 raw bytes encoded as base64 (44 chars). Used to AES-256-GCM encrypt
    // 3rd-party OAuth access/refresh tokens before persisting in Account rows.
    // Optional in dev (encryption silently degrades to passthrough) but the
    // composition root MUST refuse to boot in production without it.
    TOKEN_ENCRYPTION_KEY: z
      .string()
      .refine(
        (s) => {
          try {
            return Buffer.from(s, 'base64').length === 32;
          } catch {
            return false;
          }
        },
        { message: 'TOKEN_ENCRYPTION_KEY must be 32 raw bytes encoded as base64' },
      )
      .optional(),

    // --- LGPD / Consent versioning ---
    TOS_VERSION: z.string().optional(),
    PRIVACY_POLICY_VERSION: z.string().optional(),
    MARKETING_CONSENT_VERSION: z.string().optional(),
    SKIP_TOS_CHECK: BooleanString.optional(),

    // --- Email (SMTP / SendGrid) ---
    EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email').optional(),
    EMAIL_FROM_NAME: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: PortNumber.optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: BooleanString.optional(),
    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_EMAIL_FROM: z.string().optional(),
    SKIP_EMAIL_VERIFICATION: BooleanString.optional(),

    // --- Storage (MinIO / S3) ---
    MINIO_ENDPOINT: OptionalUrl,
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().optional(),
    MINIO_PUBLIC_ENDPOINT: OptionalUrl,

    // --- Application URLs (used in CORS, emails, frontend redirects) ---
    BACKEND_URL: OptionalUrl,
    FRONTEND_URL: OptionalUrl,
    PUBLIC_APP_URL: OptionalUrl,
    API_BASE_URL: OptionalUrl,
    UI_BASE_URL: OptionalUrl,
    // Legacy link base — outbound email link bases are now built by
    // `EmailTemplateService` from `FRONTEND_URL` (with prod fail-fast).
    // Kept optional so older deploys don't break.
    APP_URL: OptionalUrl,
    APP_VERSION: z.string().optional(),

    // --- CORS / WebSocket origin allowlist ---
    CORS_ORIGIN: z.string().optional(),
    // P1 #11 — alias / extension of CORS_ORIGIN. `buildCorsAllowlist`
    // merges both into the final list so an operator can split the
    // legacy single-source config without disturbing existing deploys.
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    ALLOWED_WS_ORIGINS: z.string().optional(),

    // --- Logging ---
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

    // --- Rate limit ---
    RATE_LIMIT_ENABLED: BooleanString.optional(),
    RATE_LIMIT_MAX: PositiveIntString.optional(),
    RATE_LIMIT_AUTH_MAX: PositiveIntString.optional(),

    // --- Login lock ---
    LOGIN_MAX_FAILED_ATTEMPTS: PositiveIntString.optional(),
    LOGIN_LOCK_DURATION_MINUTES: PositiveIntString.optional(),

    // --- Bcrypt ---
    // OWASP recommends cost ≥ 10 in production (below 10 is brute-forceable
    // on commodity GPUs today); the default 12 leaves ~2^12 hash invocations
    // per attempted login.
    //
    // Tests, CI, and dev override with `BCRYPT_COST=4` (~6ms vs ~80ms at
    // cost 12) so a single suite isn't dominated by hash time — the
    // hashes are thrown away after a few seconds. The minimum here is
    // therefore 4 (bcrypt's lowest accepted cost) and the production
    // floor of 10 is re-imposed by the `superRefine` block below.
    BCRYPT_COST: z.coerce.number().int().min(4).default(12),

    // --- Privacy: deterministic IP hashing (Wave 1.4) ---
    // 32+ char salt mixed into the IP-hash so the bucket can't be
    // rainbow-tabled from public RIR data. Optional in dev (the adapter
    // falls back to per-process random salt). REQUIRED in production via
    // the superRefine below.
    IP_HASH_SALT: z.string().min(32, 'IP_HASH_SALT must be at least 32 characters').optional(),

    // --- Swagger / OpenAPI ---
    ENABLE_SWAGGER: BooleanString.optional(),

    // --- OAuth providers ---
    GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
    GOOGLE_OAUTH_SECRET: z.string().optional(),
    GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
    GITHUB_OAUTH_SECRET: z.string().optional(),
    LINKEDIN_OAUTH_CLIENT_ID: z.string().optional(),
    LINKEDIN_OAUTH_SECRET: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),

    // --- OpenAI / AI ---
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    OPENAI_MAX_TOKENS: PositiveIntString.optional(),
    OPENAI_SCORING_MODEL: z.string().optional(),
    OPENAI_SCORING_MAX_TOKENS: PositiveIntString.optional(),
    OPENAI_EMBEDDING_MODEL: z.string().optional(),

    // --- Translation ---
    LIBRETRANSLATE_URL: OptionalUrl,

    // --- Analytics (PostHog) ---
    POSTHOG_HOST: OptionalUrl,
    POSTHOG_API_KEY: z.string().optional(),

    // --- Typst PDF rendering ---
    TYPST_BINARY_PATH: z.string().optional(),
    TYPST_FONT_PATH: z.string().optional(),
    TYPST_TEMPLATES_PATH: z.string().optional(),
    PUPPETEER_HOST: z.string().optional(),
    PUPPETEER_PORT: PortNumber.optional(),

    // --- Internal / CI ---
    INTERNAL_API_TOKEN: z.string().optional(),
    PROMETHEUS_KEY: z.string().optional(),
    SDK_COVERAGE_MODE: z.string().optional(),

    // --- Safe-fetch / SSRF defense ---
    // Hard cap on the body size the `SafeFetchStrictAdapter` will
    // consume from a webhook target before aborting with
    // `BodyTooLargeException` (P1 #46, Wave 1.5). Operators can shrink
    // it for tighter per-environment limits or grow it (rarely) for
    // legitimate large-response webhooks; the default 5 MB matches the
    // adapter's compiled-in `DEFAULT_MAX_RESPONSE_BYTES`.
    SAFE_FETCH_MAX_BYTES: z.coerce.number().int().positive().default(5_000_000),

    // --- Attestation witness ---
    ATTESTATION_WITNESS_STORAGE_PATH: z.string().optional(),
    ATTESTATION_WITNESS_SIGNING_PRIVATE_KEY: z.string().optional(),
    ATTESTATION_WITNESS_KEY_ID: z.string().optional(),
    ATTESTATION_WITNESS_CHECK_SCRIPT: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;
    // P1-#A1-17: BCRYPT_COST floor of 10 only applies in production.
    // Test/dev are allowed to lower it (typically to 4) for speed.
    if (data.BCRYPT_COST < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BCRYPT_COST'],
        message: 'BCRYPT_COST must be ≥ 10 in production (OWASP guidance)',
      });
    }
    // JWT issuer/audience are optional in dev so the local server boots
    // without setting them. In production both are required so refresh
    // tokens minted on one deploy can't be replayed against another
    // (issuer pinning) and tokens issued for one client tier can't be
    // reused on another (audience pinning).
    if (!data.JWT_ISSUER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ISSUER'],
        message: 'JWT_ISSUER is required in production',
      });
    }
    if (!data.JWT_AUDIENCE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_AUDIENCE'],
        message: 'JWT_AUDIENCE is required in production',
      });
    }
    if (!data.IP_HASH_SALT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['IP_HASH_SALT'],
        message: 'IP_HASH_SALT is required in production (>= 32 chars)',
      });
    }
  });

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export class ConfigValidationError extends Error {
  constructor(public readonly issues: ReadonlyArray<{ path: string; message: string }>) {
    const lines = issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n');
    super(`Environment configuration is invalid:\n${lines}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Parse + validate `process.env` (or any string-keyed input). Throws
 * `ConfigValidationError` aggregating all issues so a misconfigured
 * deploy sees every missing var in one report — not "fix one, hit
 * the next".
 */
export function parseEnvConfig(
  raw: NodeJS.ProcessEnv | Record<string, string | undefined>,
): EnvConfig {
  const result = EnvConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  throw new ConfigValidationError(issues);
}
