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
  'handle',
  'name',
  'title',
  'key',
]);

function suffixUniqueValues(node) {
  if (Array.isArray(node)) {
    for (const item of node) suffixUniqueValues(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === 'string' && UNIQUE_FIELDS_TO_SUFFIX.has(key)) {
      node[key] = `${value}-${RUN_ID}`;
    } else if (value && typeof value === 'object') {
      suffixUniqueValues(value);
    }
  }
}

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

function shouldSkip(name) {
  return SKIP_PATH_FRAGMENTS.some((frag) => name.includes(frag));
}

hooks.beforeEach((transaction, done) => {
  if (shouldSkip(transaction.name)) {
    transaction.skip = true;
  }
  // Dredd v14 generates one transaction per declared response status.
  // We run 200/201 (happy path with admin), 401 (anonymous request),
  // and 403 (regular user against admin-gated route). 400 is intentional
  // bad-input — out of scope until per-route invalid fixtures land.
  // 404 is also out of scope — deliberate non-existent IDs need a
  // dedicated fixture map.
  const expectedStatus = Number(transaction.expected?.statusCode) || 0;
  const allowed = new Set([200, 201, 204, 401, 403]);
  if (!allowed.has(expectedStatus)) {
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
// Permission classification: admin if the perm string ends with one of
// MANAGE / `_ALL` / `_ASSIGN` / STATS_READ, or starts with `admin:`.
// Everything else is a normal user permission.

const ADMIN_PERMISSION_SUFFIXES = [':manage', ':read_all', ':role_assign', ':stats_read'];
function isAdminPermission(perm) {
  if (!perm) return false;
  if (perm.startsWith('admin:')) return true;
  return ADMIN_PERMISSION_SUFFIXES.some((suffix) => perm.endsWith(suffix));
}

// Parse swagger.json once and build "METHOD path" → { auth, permission }.
// Path is the OpenAPI template (with `{id}` placeholders) so we can
// match against `transaction.origin.resourceName` directly.
const path = require('node:path');
const fs = require('node:fs');
const SWAGGER_PATH = path.resolve(__dirname, '../../../swagger.json');
const operationMetadata = new Map();
try {
  const swagger = JSON.parse(fs.readFileSync(SWAGGER_PATH, 'utf8'));
  for (const [pathTemplate, ops] of Object.entries(swagger.paths || {})) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (typeof op !== 'object' || op === null) continue;
      operationMetadata.set(`${method.toUpperCase()} ${pathTemplate}`, {
        auth: op['x-auth'] || 'public',
        permission: op['x-permission'] || null,
      });
    }
  }
} catch (err) {
  hooks.log(`Failed to load swagger.json metadata: ${err.message}`);
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
  let pending = 2;
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
});

function setCookieAndToken(transaction, cookie, token) {
  if (!cookie) return;
  transaction.request.headers.Cookie = cookie;
  if (token) {
    transaction.request.headers.Authorization = `Bearer ${token}`;
  }
}

hooks.beforeEachValidation((transaction, done) => {
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

  // 403 probes use the regular user — a route that 403s for admin is a
  // misconfiguration the contract suite SHOULD surface.
  if (expectedStatus === 403) {
    setCookieAndToken(transaction, regularCookie, regularToken);
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
  id: FIXTURE_GENERIC_ID,
};

hooks.beforeEach((transaction, done) => {
  if (transaction.skip) return done();
  let url = transaction.fullPath;
  for (const [name, id] of Object.entries(FIXTURE_IDS)) {
    url = url.replace(`{${name}}`, id);
  }
  transaction.fullPath = url;

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
