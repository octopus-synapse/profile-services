/**
 * Dredd hooks for the profile-services API contract test.
 *
 * Dredd runs every operation in `swagger.json` against the booted app.
 * These hooks (a) skip operations Dredd cannot validate (binary
 * downloads, SSE streams, OAuth redirects), (b) swap fixture-only path
 * params for IDs that exist in the seed, and (c) authenticate JWT-
 * required calls by performing a login first and propagating the
 * cookie/Bearer header.
 *
 * Reference: https://dredd.org/en/latest/hooks/nodejs/
 */

const hooks = require('hooks');

// ─── Skip lists ──────────────────────────────────────────────────────
//
// Operation names follow the pattern "<METHOD> <path> -> <statusCode> > <description>"
// — match by includes() against the canonical path for resilience.

/** Path substrings whose operations are skipped (binary, SSE, redirect,
 *  upload, file-driven endpoints that need a real fixture). */
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
  done();
});

// ─── Auth: login once, propagate cookie ─────────────────────────────
//
// The seed user comes from `prisma/seed.ts`. We log in before the
// suite starts and reuse the cookie for every subsequent request.

let sessionCookie = null;

hooks.beforeAll((_transactions, done) => {
  const http = require('node:http');
  const postData = JSON.stringify({
    email: process.env.DREDD_TEST_EMAIL || 'admin@example.com',
    password: process.env.DREDD_TEST_PASSWORD || 'changeme',
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
      const sessionLine = cookies.find((c) => c.startsWith('pc_session='));
      if (sessionLine) {
        sessionCookie = sessionLine.split(';')[0];
      }
      res.on('data', () => {});
      res.on('end', () => done());
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
  done();
});

// ─── Path-param substitution ────────────────────────────────────────
//
// Operations that take an ID Dredd cannot guess — we map them to seed
// fixtures here so the request resolves to a real row.

const FIXTURE_IDS = {
  ':resumeId': process.env.DREDD_FIXTURE_RESUME_ID || 'fixture-resume',
  ':userId': process.env.DREDD_FIXTURE_USER_ID || 'fixture-user',
  ':jobId': process.env.DREDD_FIXTURE_JOB_ID || 'fixture-job',
  ':postId': process.env.DREDD_FIXTURE_POST_ID || 'fixture-post',
  ':conversationId': process.env.DREDD_FIXTURE_CONVERSATION_ID || 'fixture-conv',
  ':notificationId': process.env.DREDD_FIXTURE_NOTIFICATION_ID || 'fixture-notif',
};

hooks.beforeEach((transaction, done) => {
  if (transaction.skip) return done();
  let url = transaction.fullPath;
  for (const [tpl, id] of Object.entries(FIXTURE_IDS)) {
    const param = tpl.slice(1); // 'resumeId' from ':resumeId'
    url = url.replace(`{${param}}`, id);
  }
  transaction.fullPath = url;
  done();
});
