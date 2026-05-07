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
// `beforeEachValidation` picks one based on the transaction's expected
// status: 403 means "this route is admin-gated, send regular user
// cookie so the server actually returns 403"; 200/201 means "run with
// the highest-privilege caller", which is admin.

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

hooks.beforeEachValidation((transaction, done) => {
  const expectedStatus = Number(transaction.expected?.statusCode) || 0;
  const useRegular = expectedStatus === 403;
  const useAnon = expectedStatus === 401;
  if (useAnon) {
    delete transaction.request.headers.Cookie;
    delete transaction.request.headers.Authorization;
  } else if (useRegular && regularCookie) {
    transaction.request.headers.Cookie = regularCookie;
    if (regularToken) {
      transaction.request.headers.Authorization = `Bearer ${regularToken}`;
    }
  } else if (adminCookie) {
    transaction.request.headers.Cookie = adminCookie;
    if (adminToken) {
      transaction.request.headers.Authorization = `Bearer ${adminToken}`;
    }
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
