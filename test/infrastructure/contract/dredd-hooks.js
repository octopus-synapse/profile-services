/**
 * Dredd hooks for the profile-services API contract test.
 *
 * Dredd runs every operation in `swagger.json` against the booted app.
 * These hooks (a) skip operations Dredd cannot validate (binary
 * downloads, SSE streams, OAuth redirects, mutations whose body shape
 * Dredd cannot guess), (b) substitute the fixture UUIDs the
 * `dredd-fixtures.seed` materialises, and (c) authenticate JWT-required
 * calls by performing a login first and propagating the cookie.
 *
 * Reference: https://dredd.org/en/latest/hooks/nodejs/
 */

const hooks = require('hooks');
const crypto = require('node:crypto');

// Deterministic UUIDs mirrored from
// `src/shared-kernel/schemas/params/example-values.const.ts`. Keep in sync;
// the seed materialises real rows under these IDs.
const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
const FIXTURE_POST_ID = '01900000-0000-7000-a000-000000000040';
const FIXTURE_CONVERSATION_ID = '01900000-0000-7000-a000-000000000050';
const FIXTURE_NOTIFICATION_ID = '01900000-0000-7000-a000-000000000060';
const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';

// ─── Per-run uniqueness guard (Workstream D) ─────────────────────────
//
// Every Dredd run gets a fresh `RUN_ID` (8 hex chars). POST bodies that
// would otherwise hit unique constraints (email/username/slug) are
// rewritten in `beforeEach` to include the suffix, so re-running the
// suite against the same DB never 409's on the second attempt.
const RUN_ID = crypto.randomBytes(4).toString('hex');
const UNIQUE_FIELDS_TO_SUFFIX = new Set([
  'email',
  'username',
  'slug',
  'code',
  'handle',
  'name',
  'title',
  'key',
]);

function applyUniqueSuffix(key, value) {
  // Email values must remain RFC-5322 valid after suffixing so Zod's
  // `.email()` accepts them; insert the run id before the `@`.
  if (key === 'email' && value.includes('@')) {
    const at = value.indexOf('@');
    return `${value.slice(0, at)}+${RUN_ID}${value.slice(at)}`;
  }
  // Keys following the section-type versioned pattern (e.g. "my_section_v1")
  // must end with _v<digit(s)> — appending "-RUN_ID" breaks the pattern.
  // Embed the run id before the version suffix instead.
  if (key === 'key' && /_v\d+$/.test(value)) {
    return value.replace(/_v(\d+)$/, `_${RUN_ID}_v$1`);
  }
  return `${value}-${RUN_ID}`;
}

function suffixUniqueValues(node) {
  if (Array.isArray(node)) {
    for (const item of node) suffixUniqueValues(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === 'string' && UNIQUE_FIELDS_TO_SUFFIX.has(key)) {
      node[key] = applyUniqueSuffix(key, value);
    } else if (value && typeof value === 'object') {
      suffixUniqueValues(value);
    }
  }
}

// ─── Route-specific body overrides ───────────────────────────────────
// Routes where Dredd's faker cannot produce a valid body (minLength:1 fields,
// pattern-constrained keys, etc.). Unique fields are run-id-suffixed by
// suffixUniqueValues() after the override is cloned.
const ROUTE_BODY_OVERRIDES = {
  'POST /v1/admin/fit-questions': {
    key: 'fixture-fit-q',
    dimension: 'BIG_FIVE_OPENNESS',
    textEn: 'I enjoy new experiences.',
    textPtBr: 'Gosto de novas experiências.',
    scaleType: 'likert5',
    weight: 1,
    isActive: true,
    reverseScored: false,
  },
  'POST /v1/admin/section-types': {
    key: 'fixture_v1',
    slug: 'fixture-slug',
    title: 'Fixture Section',
    semanticKind: 'experience',
    definition: { fields: [], translations: {} },
    translations: {
      en: { title: 'Fixture Section', label: 'Fixture' },
      'pt-BR': { title: 'Seção Fixture', label: 'Fixture' },
    },
  },
};

// ─── Skip lists ──────────────────────────────────────────────────────
//
// Operation names follow the pattern "<METHOD> <path> -> <statusCode> > <description>"
// — match by includes() against the canonical path for resilience.

/** Path substrings whose operations are *structurally unsupportable* by Dredd.
 *  Only categories Dredd cannot validate at all belong here — never use this
 *  list as a workaround for spec drift, missing fixtures, or auth shape. */
const SKIP_PATH_FRAGMENTS = [
  // SSE streams — Dredd does not understand text/event-stream.
  '/v1/stream',
  '/v1/feature-flags/stream',
  '/v1/notifications/subscribe',
  '/v1/onboarding/preview/stream',
  '/v1/feed/subscribe',
  // Binary downloads — Dredd compares JSON bodies; binary diffs are not useful.
  '/export/banner',
  '/export/resume/pdf',
  '/export/resume/docx',
  '/export/{resumeId}/json',
  '/export/{resumeId}/latex',
  '/og.png',
  '/qr.png',
  '/preview.pdf',
  '/thumbnail.svg',
  // OAuth flows — issue 302 redirects to external providers.
  '/v1/auth/oauth/github',
  '/v1/auth/oauth/linkedin',
  // Multipart uploads — need a real file fixture; covered by integration tests.
  '/v1/upload/profile-image',
  '/v1/upload/company-logo',
  '/v1/resumes/imports/pdf',
  '/v1/posts/upload-image',
  // Prometheus / health — not part of the API contract.
  '/api/metrics',
  '/api/health',
];

/** Method+path pairs that, run against the regular fixture user, corrupt
 *  the session for every subsequent JWT-required transaction in the same
 *  Dredd run. The seed re-arms `isActive` between runs but cannot
 *  recover mid-run, so we exclude the destructive verbs entirely. */
const SKIP_DESTRUCTIVE_OPS = [
  // Match the exact route template (no trailing-segment ambiguity).
  { method: 'DELETE', path: '/v1/accounts' },
  { method: 'DELETE', path: '/v1/accounts/deactivate' },
  // Protects the generic fixture user (EXAMPLE_GENERIC_ID) from being
  // destroyed mid-run — it must remain for /users/manage/{id} GET routes.
  { method: 'DELETE', path: '/v1/users/manage/{id}' },
  // Protects the fixture resume (EXAMPLE_RESUME_ID). Deleting it cascades
  // to SectionItems, ResumeVersions, ResumeShares, CollaborationComments
  // and all other resume-owned entities seeded for Dredd.
  { method: 'DELETE', path: '/v1/resumes/{resumeId}' },
  { method: 'DELETE', path: '/v1/resumes/manage/{resumeId}' },
  // Protects shared-ID fixture entities seeded under EXAMPLE_GENERIC_ID.
  { method: 'DELETE', path: '/v1/jobs/{id}' },
  { method: 'DELETE', path: '/v1/posts/{id}' },
  { method: 'DELETE', path: '/v1/shares/{shareId}' },
  { method: 'DELETE', path: '/v1/resumes/{resumeId}/sections/{sectionTypeKey}/items/{itemId}' },
  { method: 'DELETE', path: '/v1/resumes/{resumeId}/skills/{skillId}' },
  { method: 'DELETE', path: '/v1/resumes/imports/{importId}' },
  { method: 'DELETE', path: '/v1/resumes/comments/{commentId}' },
  // Protects Connection fixture — reject/accept/withdraw/delete are
  // different paths in Dredd; if DELETE runs first, the others 404.
  { method: 'DELETE', path: '/v1/connections/{id}' },
  { method: 'DELETE', path: '/v1/connections/{id}/withdraw' },
  // Protects the SuccessStory and WebhookConfig fixtures.
  { method: 'DELETE', path: '/v1/success-stories/{id}' },
  { method: 'DELETE', path: '/v1/webhooks/{id}' },
  // Protects the generic post and post comments.
  { method: 'DELETE', path: '/v1/posts/comments/{id}' },
  // Admin catalog DELETE routes: each entity is seeded exactly once per
  // run. The DELETE probe runs before GET/PATCH in Dredd's alphabetical
  // order, destroying the fixture and causing those probes to 404.
  { method: 'DELETE', path: '/v1/admin/programming-languages/{slug}' },
  { method: 'DELETE', path: '/v1/admin/tech-skills/{id}' },
  { method: 'DELETE', path: '/v1/admin/resume-styles/{id}' },
  { method: 'DELETE', path: '/v1/admin/tech-niches/{id}' },
  { method: 'DELETE', path: '/v1/admin/tech-areas/{id}' },
  { method: 'DELETE', path: '/v1/admin/spoken-languages/{code}' },
  { method: 'DELETE', path: '/v1/admin/fit-questions/{id}' },
  { method: 'DELETE', path: '/v1/admin/section-types/{key}' },
  // Token-verification routes need a live token from a prior step (password
  // reset, email verification, 2FA setup). Dredd synthesizes a generic
  // string body — no valid token exists in the DB → handler returns 400/404
  // instead of 2xx. Skip the success transaction; 400/401 probes still run.
  { method: 'POST', path: '/v1/auth/reset-password' },
  { method: 'POST', path: '/v1/auth/email-verification/verify' },
  { method: 'POST', path: '/v1/auth/2fa/verify' },
  { method: 'POST', path: '/v1/auth/login/verify-2fa' },
  { method: 'POST', path: '/v1/auth/2fa/setup' },
  // Seeded JobApplication uses EXAMPLE_JOB_ID not EXAMPLE_GENERIC_ID
  // (the generic {id} is the job id here), so the 200 probe would 404.
  { method: 'DELETE', path: '/v1/jobs/{id}/apply' },
  // Connection state: ACCEPT changes status → REJECT 200 would fail.
  // WITHDRAW is by the requester (generic user) but we authenticate as
  // the fixture user (target) — 403, not 200.
  { method: 'PUT', path: '/v1/connections/{id}/reject' },
  { method: 'DELETE', path: '/v1/connections/{id}/withdraw' },
];

function shouldSkip(name, transaction) {
  if (SKIP_PATH_FRAGMENTS.some((frag) => name.includes(frag))) return true;
  const method = (transaction?.request?.method || '').toUpperCase();
  const template = transaction?.origin?.resourceName || transaction?.origin?.uriTemplate || '';
  const normalized = template.startsWith('/api') ? template.slice(4) : template;
  const matchesDestructive = SKIP_DESTRUCTIVE_OPS.some(
    (op) => op.method === method && op.path === normalized,
  );
  if (matchesDestructive) {
    const expectedStatus = Number(transaction?.expected?.statusCode) || 0;
    return expectedStatus === 200 || expectedStatus === 201 || expectedStatus === 204;
  }
  const meta = lookupOperation(transaction);
  if (meta?.guards?.includes('internal-auth')) return true;
  if (meta?.isSse) return true;
  return false;
}

const ALLOWED_STATUSES = new Set([200, 201, 204, 400, 401, 403, 404]);

hooks.beforeEach((transaction, done) => {
  if (shouldSkip(transaction.name, transaction)) {
    transaction.skip = true;
  }
  const expectedStatus = Number(transaction.expected?.statusCode) || 0;
  if (!ALLOWED_STATUSES.has(expectedStatus)) {
    transaction.skip = true;
  }
  done();
});

// ─── Auth: login once per persona, propagate cookie ───────────────────
//
// Two personas are seeded:
//   - admin (admin@example.com / Admin123!@#)
//   - regular user (dredd-fixture@profile.local / Dredd_Fixture_Password_123!)
//
// The hook captures both session cookies up front, then in
// `beforeEachValidation` picks one based on the operation's declared
// authorization metadata (read from the `x-permission` / `x-auth`
// extensions the swagger generator emits):
//
//   - `x-auth: public`          → no cookie (anonymous)
//   - expected 401              → no cookie (assert auth is enforced)
//   - expected 403              → regular user (assert admin gate works)
//   - admin-level x-permission  → admin cookie (only admin can succeed)
//   - non-admin x-permission OR plain `x-auth: jwt` → regular user cookie
//
// Using `route.permission` instead of guessing from the expected status
// catches misconfigurations the status-only heuristic missed (e.g. an
// admin-gated route declared without a 403 example).
//
// Permission classification: an authoritative set is emitted into
// `swagger.info['x-admin-permissions']` by the swagger generator —
// computed from the role/group definitions so it always matches the
// runtime authorization model. Anything not in that set is treated as
// granted to the regular fixture user (role_user).

const path = require('node:path');
const fs = require('node:fs');
const SWAGGER_PATH = path.resolve(__dirname, '../../../swagger.json');
const operationMetadata = new Map();
const adminPermissions = new Set();
let swaggerDoc = null;
try {
  const swagger = JSON.parse(fs.readFileSync(SWAGGER_PATH, 'utf8'));
  swaggerDoc = swagger;
  for (const p of swagger.info?.['x-admin-permissions'] ?? []) adminPermissions.add(p);
  for (const [pathTemplate, ops] of Object.entries(swagger.paths || {})) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (typeof op !== 'object' || op === null) continue;
      const pathParamExamples = (op.parameters || [])
        .filter((p) => p.in === 'path' && p.example !== undefined)
        .map((p) => ({ name: String(p.name), example: String(p.example) }));
      const response200 = op.responses?.['200'];
      const response200ContentTypes = Object.keys(response200?.content || {});
      const isSse =
        response200 !== undefined &&
        (response200ContentTypes.length === 0 ||
          response200ContentTypes.some((ct) => ct.includes('event-stream')));
      const queryParams = (op.parameters || []).filter((p) => p.in === 'query');
      operationMetadata.set(`${method.toUpperCase()} ${pathTemplate}`, {
        auth: op['x-auth'] || 'public',
        permission: op['x-permission'] || null,
        guards: Array.isArray(op['x-guards']) ? op['x-guards'] : [],
        requestBodySchema: op.requestBody?.content?.['application/json']?.schema || null,
        pathParamExamples,
        isSse,
        queryParams,
      });
    }
  }
} catch (err) {
  hooks.log(`Failed to load swagger.json metadata: ${err.message}`);
}

function isAdminPermission(perm) {
  return perm !== null && perm !== undefined && adminPermissions.has(perm);
}

function lookupOperation(transaction) {
  const method = (
    transaction.request?.method ||
    transaction.origin?.actionName ||
    ''
  ).toUpperCase();
  // Prefer Dredd's parsed origin (carries the path template). Fallback to
  // matching on the full path against templates if origin is absent.
  const template = transaction.origin?.resourceName || transaction.origin?.uriTemplate;
  if (template) {
    const meta = operationMetadata.get(`${method} ${template}`);
    if (meta) return meta;
  }
  // Last-resort fallback: regex match.
  const fullPath = transaction.fullPath || '';
  for (const [key, meta] of operationMetadata) {
    const [keyMethod, keyPath] = key.split(' ');
    if (keyMethod !== method) continue;
    const regex = new RegExp(`^${keyPath.replace(/\{[^}]+\}/g, '[^/]+')}$`);
    if (regex.test(fullPath)) return meta;
  }
  return null;
}

let adminCookie = null;
let adminToken = null;
let regularCookie = null;
let regularToken = null;
let nonPrivCookie = null;
let nonPrivToken = null;

function login(email, password, callback) {
  const http = require('node:http');
  const postData = JSON.stringify({ email, password });
  const req = http.request(
    {
      host: 'localhost',
      port: process.env.PORT || 3010,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    (res) => {
      const cookies = res.headers['set-cookie'] || [];
      const sessionLine = cookies.find((c) => c.startsWith('access_token='));
      let cookie = null;
      let token = null;
      if (sessionLine) {
        cookie = sessionLine.split(';')[0];
        token = cookie.split('=')[1];
      }
      res.on('data', () => {});
      res.on('end', () => callback(null, { status: res.statusCode, cookie, token }));
    },
  );
  req.on('error', (err) => callback(err));
  req.write(postData);
  req.end();
}

hooks.beforeAll((_transactions, done) => {
  let pending = 3;
  const finish = () => {
    pending -= 1;
    if (pending === 0) done();
  };
  login(
    process.env.DREDD_ADMIN_EMAIL || 'admin@example.com',
    process.env.DREDD_ADMIN_PASSWORD || 'Admin123!@#',
    (err, result) => {
      if (err) {
        hooks.log(`Dredd admin login failed: ${err.message}`);
      } else {
        adminCookie = result.cookie;
        adminToken = result.token;
        hooks.log(
          `Dredd admin login: status=${result.status} cookie=${adminCookie ? 'ok' : 'missing'}`,
        );
      }
      finish();
    },
  );
  login(
    process.env.DREDD_USER_EMAIL || 'dredd-fixture@profile.local',
    process.env.DREDD_USER_PASSWORD || 'Dredd_Fixture_Password_123!',
    (err, result) => {
      if (err) {
        hooks.log(`Dredd regular login failed: ${err.message}`);
      } else {
        regularCookie = result.cookie;
        regularToken = result.token;
        hooks.log(
          `Dredd user login: status=${result.status} cookie=${regularCookie ? 'ok' : 'missing'}`,
        );
      }
      finish();
    },
  );
  login(
    process.env.DREDD_NOPERMS_EMAIL || 'dredd-noperms@profile.local',
    process.env.DREDD_NOPERMS_PASSWORD || 'Dredd_Fixture_Password_123!',
    (err, result) => {
      if (err) {
        hooks.log(`Dredd no-perms login failed: ${err.message}`);
      } else {
        nonPrivCookie = result.cookie;
        nonPrivToken = result.token;
        hooks.log(
          `Dredd no-perms login: status=${result.status} cookie=${nonPrivCookie ? 'ok' : 'missing'}`,
        );
      }
      finish();
    },
  );
});

function setCookieAndToken(transaction, cookie, token) {
  if (!cookie) return;
  transaction.request.headers.Cookie = cookie;
  if (token) {
    transaction.request.headers.Authorization = `Bearer ${token}`;
  }
}

// Auth-header injection runs in `beforeEach`, NOT `beforeEachValidation`.
// In Dredd, `beforeEachValidation` fires AFTER the request is dispatched
// (it runs before the response is *validated*, not before the request is
// sent), so headers added there never reach the server — every JWT-gated
// transaction would surface as a 401 even though login succeeded at boot.
hooks.beforeEach((transaction, done) => {
  if (transaction.skip) return done();
  const expectedStatus = Number(transaction.expected?.statusCode) || 0;
  const meta = lookupOperation(transaction);
  const auth = meta?.auth || 'jwt';
  const permission = meta?.permission;

  // Anonymous: route declared as public, OR we're explicitly probing 401.
  if (auth === 'public' || expectedStatus === 401) {
    delete transaction.request.headers.Cookie;
    delete transaction.request.headers.Authorization;
    return done();
  }

  // 403 probes use the no-perms user — authenticated (valid session) but
  // zero role assignments, so every permission check returns 403 regardless
  // of whether the route is admin-gated or user-level-gated.
  if (expectedStatus === 403) {
    setCookieAndToken(transaction, nonPrivCookie, nonPrivToken);
    return done();
  }

  // Success path: pick admin if the route's permission requires it,
  // otherwise the regular user (asserts the user persona truly has the
  // permission instead of relying on admin's universal access).
  if (isAdminPermission(permission)) {
    setCookieAndToken(transaction, adminCookie, adminToken);
  } else {
    setCookieAndToken(transaction, regularCookie, regularToken);
  }
  done();
});

// Body / header validation is now strict: Dredd validates the live
// response body against the schema declared in `swagger.json`. Drifts
// (extra/missing fields, content-type case, nullable shape) are real
// contract violations that this suite intentionally surfaces.

// ─── Path-param substitution ────────────────────────────────────────
//
// Defensive layer on top of the OpenAPI examples — when the spec ships
// a real example value (post-step-2 sweep), Dredd already substitutes
// it at compile time and the loop below is a no-op. The hook still
// covers any `:foo`-shaped param the spec missed.

const FIXTURE_IDS = {
  userId: process.env.DREDD_FIXTURE_USER_ID || FIXTURE_USER_ID,
  resumeId: process.env.DREDD_FIXTURE_RESUME_ID || FIXTURE_RESUME_ID,
  jobId: process.env.DREDD_FIXTURE_JOB_ID || FIXTURE_JOB_ID,
  postId: process.env.DREDD_FIXTURE_POST_ID || FIXTURE_POST_ID,
  conversationId: process.env.DREDD_FIXTURE_CONVERSATION_ID || FIXTURE_CONVERSATION_ID,
  notificationId: process.env.DREDD_FIXTURE_NOTIFICATION_ID || FIXTURE_NOTIFICATION_ID,
  // All entity types with {id} or UUID-typed params use EXAMPLE_GENERIC_ID.
  id: FIXTURE_GENERIC_ID,
  shareId: FIXTURE_GENERIC_ID,
  aliasId: FIXTURE_GENERIC_ID,
  importId: FIXTURE_GENERIC_ID,
  versionId: FIXTURE_GENERIC_ID,
  itemId: FIXTURE_GENERIC_ID,
  commentId: FIXTURE_GENERIC_ID,
  applicationId: FIXTURE_GENERIC_ID,
  modifierId: FIXTURE_GENERIC_ID,
  skillId: FIXTURE_GENERIC_ID,
};

const MISSING_ID_SENTINEL = '00000000-0000-0000-0000-000000000000';
const MISSING_SLUG_SENTINEL = 'missing-fixture-slug-sentinel';

function synthesizeDummyValue(schema) {
  if (!schema) return null;
  if (schema.$ref) {
    if (!swaggerDoc) return null;
    const parts = schema.$ref.replace(/^#\//, '').split('/');
    let node = swaggerDoc;
    for (const part of parts) node = node?.[part];
    return node ? synthesizeDummyValue(node) : null;
  }
  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0)
    return synthesizeDummyValue(schema.anyOf[0]);
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0)
    return synthesizeDummyValue(schema.oneOf[0]);
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0)
    return synthesizeDummyValue(schema.allOf[0]);
  switch (schema.type) {
    case 'string': {
      if (schema.pattern) {
        if (schema.pattern.includes('_v\\d+')) return 'section_v1';
        if (schema.pattern.includes('linkedin.com')) return 'https://www.linkedin.com/in/fixture';
        if (schema.pattern.includes('github.com')) return 'https://github.com/fixture';
        if (schema.pattern.startsWith('^https?')) return 'https://example.com';
      }
      if (schema.format === 'email') return 'fixture@example.com';
      if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00.000Z';
      if (schema.format === 'date') return '2024-01-01';
      {
        const minLen = schema.minLength ?? 0;
        const maxLen = schema.maxLength;
        let result = 'dummy';
        if (result.length < minLen) result = result.padEnd(minLen, '0');
        if (maxLen !== undefined && result.length > maxLen) result = result.slice(0, maxLen);
        return result;
      }
    }
    case 'number':
    case 'integer': {
      const min = schema.minimum ?? 0;
      return schema.exclusiveMinimum ? min + 1 : min;
    }
    case 'boolean':
      return false;
    case 'array': {
      if (schema.items) return [synthesizeDummyValue(schema.items)];
      return [];
    }
    case 'object': {
      const props = schema.properties || {};
      const required = schema.required || [];
      const obj = {};
      if (required.length > 0) {
        for (const field of required) {
          const val = synthesizeDummyValue(props[field] || {});
          if (val !== null) obj[field] = val;
        }
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        const subVal = synthesizeDummyValue(schema.additionalProperties);
        if (subVal !== null) {
          obj.en = subVal;
          obj['pt-BR'] = subVal;
        }
      }
      return obj;
    }
    default:
      return null;
  }
}

function synthesizeValidBody(meta) {
  const schema = meta?.requestBodySchema;
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  const properties = schema.properties || {};
  const required = schema.required || [];
  const body = {};
  for (const field of required) {
    const val = synthesizeDummyValue(properties[field] || {});
    if (val !== null) body[field] = val;
  }
  return body;
}

function synthesizeInvalidQuery(url, meta) {
  const queryParams = meta?.queryParams || [];
  const required = queryParams.filter((p) => p.required);
  const parsed = new URL(`http://localhost${url}`);
  if (required.length > 0) {
    parsed.searchParams.delete(required[0].name);
    return parsed.pathname + (parsed.search || '');
  }
  const enumParam = queryParams.find((p) => Array.isArray(p.schema?.enum));
  if (enumParam) {
    parsed.searchParams.set(enumParam.name, '__invalid_enum__');
    return parsed.pathname + parsed.search;
  }
  const numParam = queryParams.find(
    (p) => p.schema?.type === 'integer' || p.schema?.type === 'number',
  );
  if (numParam) {
    parsed.searchParams.set(numParam.name, 'notanumber');
    return parsed.pathname + parsed.search;
  }
  return null;
}

function synthesizeInvalidBody(meta) {
  const schema = meta?.requestBodySchema;
  if (!schema) return null;
  const properties = schema.properties || {};
  const required = schema.required || [];
  if (required.length > 0) {
    const stripped = required[0];
    const body = {};
    for (const [k, v] of Object.entries(properties)) {
      if (k === stripped) continue;
      body[k] = synthesizeDummyValue(v);
    }
    return body;
  }
  const firstKey = Object.keys(properties)[0];
  if (!firstKey) return null;
  const firstType = properties[firstKey]?.type;
  return {
    [firstKey]: firstType === 'string' ? 99999 : 'invalid-type-sentinel',
  };
}

hooks.beforeEach((transaction, done) => {
  if (transaction.skip) return done();
  const expectedStatus = Number(transaction.expected?.statusCode) || 0;
  let url = transaction.fullPath;

  if (expectedStatus === 404) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const meta404 = lookupOperation(transaction);

    // Replace fixture UUIDs (already substituted from spec examples by Dredd).
    for (const [name, id] of Object.entries(FIXTURE_IDS)) {
      if (id) url = url.replaceAll(id, MISSING_ID_SENTINEL);
      url = url.replace(`{${name}}`, MISSING_ID_SENTINEL);
    }
    // Replace spec-example values for each path param (covers string params
    // like {key}="fixture-slug" that aren't in FIXTURE_IDS).
    for (const { example } of meta404?.pathParamExamples ?? []) {
      const sentinel = UUID_RE.test(example) ? MISSING_ID_SENTINEL : MISSING_SLUG_SENTINEL;
      url = url.replaceAll(example, sentinel);
    }
    // Sweep any remaining un-substituted {template} vars.
    url = url.replace(/\{[^}]+\}/g, MISSING_SLUG_SENTINEL);

    // Dredd v14 uses transaction.request.uri for the actual HTTP request;
    // fullPath alone is insufficient.
    transaction.fullPath = url;
    if (transaction.request) transaction.request.uri = url;

    // Synthesize a valid request body so body validation passes and the
    // server reaches the entity-lookup stage (where it returns 404).
    const validBody = synthesizeValidBody(meta404);
    if (validBody !== null) {
      transaction.request.body = JSON.stringify(validBody);
      transaction.request.headers['Content-Type'] = 'application/json';
    }
    return done();
  }

  for (const [name, id] of Object.entries(FIXTURE_IDS)) {
    url = url.replace(`{${name}}`, id);
  }
  transaction.fullPath = url;
  if (transaction.request) transaction.request.uri = url;

  if (expectedStatus === 401 || expectedStatus === 403) {
    // Body validation runs before auth/permission guards. Send a minimal
    // valid body so the guard (not Zod) decides the outcome.
    const metaAuth = lookupOperation(transaction);
    const validBody = synthesizeValidBody(metaAuth);
    if (validBody !== null) {
      transaction.request.body = JSON.stringify(validBody);
      transaction.request.headers['Content-Type'] = 'application/json';
    }
    return done();
  }

  if (expectedStatus === 400) {
    const meta = lookupOperation(transaction);
    const method = (transaction.request?.method || '').toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      const newUrl = synthesizeInvalidQuery(transaction.fullPath, meta);
      if (newUrl !== null) {
        transaction.fullPath = newUrl;
        if (transaction.request) transaction.request.uri = newUrl;
      } else {
        transaction.skip = true;
        hooks.log(`[400-synthesis] no query surface for ${transaction.name} — skipping`);
      }
      return done();
    }
    const invalid = synthesizeInvalidBody(meta);
    if (invalid !== null) {
      transaction.request.body = JSON.stringify(invalid);
      transaction.request.headers['Content-Type'] = 'application/json';
    } else {
      transaction.skip = true;
      hooks.log(`[400-synthesis] no body schema for ${transaction.name} — skipping`);
    }
    return done();
  }

  // Routes whose body Dredd's faker cannot synthesise correctly (empty strings
  // for minLength:1 fields, invalid patterns like _vN key suffix). Hard-coded
  // here so swagger.json stays clean (no manually injected `example` blocks
  // that get stripped by the swagger-fresh pre-commit check).
  const path = transaction.request?.uri?.split('?')[0] ?? '';
  const method = (transaction.request?.method ?? '').toUpperCase();
  const routeKey = `${method} ${path}`;
  if (ROUTE_BODY_OVERRIDES[routeKey]) {
    const override = JSON.parse(JSON.stringify(ROUTE_BODY_OVERRIDES[routeKey]));
    suffixUniqueValues(override);
    transaction.request.body = JSON.stringify(override);
    transaction.request.headers['Content-Type'] = 'application/json';
    return done();
  }

  if (transaction.request && typeof transaction.request.body === 'string') {
    try {
      const parsed = JSON.parse(transaction.request.body);
      suffixUniqueValues(parsed);
      transaction.request.body = JSON.stringify(parsed);
    } catch {
      // Non-JSON body (form-data, plain text, etc.) — leave untouched.
    }
  }
  done();
});

hooks.beforeAll((_transactions, done) => {
  hooks.log(`Dredd run id: ${RUN_ID} (used to suffix unique fields)`);
  done();
});
