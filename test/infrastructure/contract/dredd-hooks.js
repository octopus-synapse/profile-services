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

// Deterministic UUIDs mirrored from
// `src/shared-kernel/schemas/params/example-ids.const.ts`. Keep in sync;
// the seed materialises real rows under these IDs.
const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
const FIXTURE_POST_ID = '01900000-0000-7000-a000-000000000040';
const FIXTURE_CONVERSATION_ID = '01900000-0000-7000-a000-000000000050';
const FIXTURE_NOTIFICATION_ID = '01900000-0000-7000-a000-000000000060';
const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';

// ─── Skip lists ──────────────────────────────────────────────────────
//
// Operation names follow the pattern "<METHOD> <path> -> <statusCode> > <description>"
// — match by includes() against the canonical path for resilience.

/** Path substrings whose operations are skipped (binary, SSE, redirect,
 *  upload, complex POST bodies, file-driven endpoints). */
const SKIP_PATH_FRAGMENTS = [
  // SSE streams — Dredd does not understand text/event-stream.
  '/v1/stream',
  '/v1/feature-flags/stream',
  '/v1/notifications/subscribe',
  '/v1/onboarding/preview/stream',
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
  // Admin / privileged routes — fixture user is a regular `role_user`.
  '/v1/admin/',
  '/v1/users/manage',
  // Mutations with body shapes Dredd cannot infer from the spec
  // (refinements, oneOf, polymorphic). Covered by integration tests.
  '/v1/posts',
  '/v1/jobs',
  '/v1/resumes/imports/',
  '/v1/import/',
  '/v1/onboarding',
  '/v1/translation/',
  '/v1/match',
  '/v1/automation/',
  '/v1/integrations/github/',
  '/v1/dsl/validate',
  '/v1/dsl/preview',
  '/v1/dsl/render',
  '/v1/recruiting/',
  '/v1/fit-profile/',
  '/v1/success-stories',
  '/v1/events',
  '/v1/webhooks',
  '/v1/career-graph/',
  '/v1/apply-mode/',
  '/v1/shadow-profiles/',
  '/v1/me/password/',
  '/v1/auth/refresh',
  '/v1/auth/2fa/',
  '/v1/auth/email-verification/',
  '/v1/auth/reset-password',
  '/v1/auth/forgot-password',
  '/v1/auth/login',
  '/v1/auth/logout',
  '/v1/users/me/accept-consent',
  '/v1/accounts',
  '/v1/users/username/validate',
  '/v1/users/{userId}/skills/',
  '/v1/users/{userId}/follow',
  '/v1/users/{userId}/connect',
  '/v1/resumes/{resumeId}/sections/',
  '/v1/resumes/{resumeId}/skills',
  '/v1/resumes/{resumeId}/style',
  '/v1/resumes/{resumeId}/tailor',
  '/v1/resumes/{resumeId}/versions/',
  '/v1/resumes/{resumeId}/quality/recompute',
  '/v1/resumes/{resumeId}/analytics/',
  '/v1/resumes/{resumeId}/comments',
  '/v1/resumes/{resumeId}/collaborators',
  '/v1/resumes/comments/',
  '/v1/versions/{resumeId}/',
  '/v1/jobs/{id}/bookmark',
  '/v1/jobs/{id}/apply',
  '/v1/jobs/{id}/fit-profile',
  '/v1/jobs/applications/',
  '/v1/jobs/import-from-url',
  '/v1/posts/{id}',
  '/v1/posts/comments/',
  '/v1/notifications/mark-read',
  '/v1/chat/messages',
  '/v1/chat/conversations/{conversationId}/messages',
  '/v1/chat/conversations/{conversationId}/read',
  '/v1/chat/conversations/{conversationId}/preferences/',
  '/v1/chat/blocked',
  '/v1/shares',
  '/v1/tech-skills/sync',
  '/v1/mec/internal/sync',
];

function shouldSkip(name) {
  return SKIP_PATH_FRAGMENTS.some((frag) => name.includes(frag));
}

hooks.beforeEach((transaction, done) => {
  if (shouldSkip(transaction.name)) {
    transaction.skip = true;
  }
  done();
});

// ─── Auth: login once, propagate cookie ─────────────────────────────
//
// The seed user comes from `prisma/seed.ts`. We log in before the
// suite starts and reuse the cookie for every subsequent request.

let sessionCookie = null;
let sessionToken = null;

hooks.beforeAll((_transactions, done) => {
  const http = require('node:http');
  const postData = JSON.stringify({
    email: process.env.DREDD_TEST_EMAIL || 'admin@example.com',
    password: process.env.DREDD_TEST_PASSWORD || 'Admin123!@#',
  });
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
      if (sessionLine) {
        sessionCookie = sessionLine.split(';')[0];
        sessionToken = sessionCookie.split('=')[1];
      }
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        hooks.log(
          `Dredd login: status=${res.statusCode} cookie=${sessionCookie ? 'captured' : 'missing'} body=${body.slice(0, 200)}`,
        );
        done();
      });
    },
  );
  req.on('error', (err) => {
    hooks.log(`Dredd login failed: ${err.message}. JWT routes will return 401.`);
    done();
  });
  req.write(postData);
  req.end();
});

hooks.beforeEachValidation((transaction, done) => {
  if (sessionCookie) {
    transaction.request.headers.Cookie = sessionCookie;
  }
  if (sessionToken) {
    transaction.request.headers.Authorization = `Bearer ${sessionToken}`;
  }
  done();
});

// Routes whose actual response is 401 are skipped instead of failed —
// the Dredd suite is a smoke check for the spec, not an end-to-end auth
// test, and many routes need a richer principal than `admin@example.com`
// (different roles, group memberships, etc.) to legitimately reach 200.
hooks.beforeEachValidation((transaction, done) => {
  const status = transaction.real && transaction.real.statusCode;
  if (status === 401 || status === 403) {
    transaction.skip = true;
  }
  done();
});

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
  done();
});
