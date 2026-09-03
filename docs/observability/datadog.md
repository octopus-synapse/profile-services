# Datadog Observability

## Rollout

Production uses the Docker Agent override:

```sh
docker compose -f docker-compose.yml -f infra/docker/docker-compose.datadog.yml up -d
```

Required secret:

- `DD_API_KEY`

Recommended production tags:

- `DD_ENV=prod`
- `DD_SERVICE=profile-services`
- `DD_VERSION=<image tag or git sha>`

## What Is Collected

- Docker host/container metrics through the Agent Docker socket mount.
- Backend logs from `profile-backend` with `env`, `service`, `version`, `traceId`, `spanId`, `route`, `status`, `durationMs`, `ipHash`, and `userHash`.
- Manual OpenTelemetry spans for every Elysia route, exported to `http://datadog-agent:4318/v1/traces`.
- DogStatsD HTTP metrics:
  - `profile_services.http.requests`
  - `profile_services.http.errors`
  - `profile_services.http.request.duration_ms`
- DogStatsD domain event metrics:
  - `profile_services.domain.events`
- Postgres and Redis Autodiscovery checks from Docker labels.
- HTTP checks from `infra/docker/datadog/conf.d/http_check.d/conf.yaml`: MinIO liveness and the backend's translation health (`GET /api/v1/translation/health`, cached 1h, never reaches the LLM provider).
- BullMQ queue depth via the Redis check's `keys` option (see below).

## Privacy Rules

- Do not emit email, tokens, passwords, cookies, CV/resume content, raw document text, or raw payload blobs.
- Do not use user/resume/job/session IDs as metric tags.
- Request logs use `ipHash` and `userHash`.
- Domain event telemetry hashes aggregate/entity IDs before logging.
- The Winston adapter redacts common raw IDs and sensitive fields from legacy logs before they leave the process.

## Starter Dashboard

Create a dashboard with:

- Request volume: `sum:profile_services.http.requests{env:prod,service:profile-services} by {route,status_class}.as_count()`
- Error rate: `sum:profile_services.http.errors{env:prod,service:profile-services}.as_count() / sum:profile_services.http.requests{env:prod,service:profile-services}.as_count()`
- Latency p95/p99 from `profile_services.http.request.duration_ms` grouped by `route`.
- Top endpoints by request volume grouped by `route`.
- Domain events: `sum:profile_services.domain.events{env:production,service:profile-services} by {event_type}.as_count()`
- Container restarts and health for `profile-backend`, `profile-postgres`, `profile-redis`, and `profile-minio`.
- Postgres and Redis integration panels from Datadog's built-in dashboards.

## Starter Monitors

- Backend unhealthy/restarting: alert when `profile-backend` container health is not healthy or restarts in a 5 minute window.
- 5xx spike: alert when backend error rate is above 2% for 10 minutes.
- Latency spike: alert when p95 latency for any high-volume route is above 2 seconds for 10 minutes.
- Auth abuse signal: alert when `profile_services.domain.events{event_type:auth.login.failed}` spikes above baseline.
- Critical processing failures: alert on `event_type:export.failed` or failed scoring/job events above baseline.
- Postgres/Redis health: alert on failed integration checks or connection saturation.
- Translation health: alert when `http_check` `profile-backend-translation-health` is down for 10 minutes.
- BullMQ backlog and stalls: see the next section.

## BullMQ Queues

There is no BullMQ exporter in the app and none is needed: BullMQ keeps
every queue as plain Redis keys, and the `redisdb` Autodiscovery check on
`profile-redis` (label in `docker-compose.yml`) already scans them via its
`keys` option — `bull:*:wait`, `bull:*:active`, `bull:*:failed`,
`bull:*:stalled`. Each shows up as `redis.key.length` tagged `key:<name>`,
so the alerting is Datadog configuration only; nothing in `src/` changes.

Queues in play (consumers are registered by `registerBcWorkers` at boot;
the boot log lists each one as `consuming` or `inert`): `resume-quality`,
`job-match-recompute`, `daily-recommendations`, `fit-profile-expiry-reminder`,
`fit-profile-expire`, `cache-invalidation`, and — gated by the
`automation.enabled` flag, off by default — `auto-apply`, `weekly-curated`.

Monitors:

- Backlog: `avg:redis.key.length{key:bull:*:wait}` by `key` above 100 for 15 minutes. A queue that only ever grows has no consumer — check the boot log for `Worker registered`.
- Stalled: `max:redis.key.length{key:bull:*:stalled}` by `key` above 0 for 5 minutes. A stalled job is one whose worker stopped heartbeating (usually a crashed or wedged process).
- Failures: `max:redis.key.length{key:bull:*:failed}` by `key` increasing by more than 10 over 1 hour. Jobs land here only after the adapter's 3 attempts.
- Inert-on-purpose queues (`auto-apply`, `weekly-curated` while the flag is off) hold at most one delayed repeat job and never appear in `wait`; exclude them from the backlog monitor if the flag stays off.

## Validation Checklist

- The Agent appears in Datadog under host `profile-services-vps`.
- `profile-backend` logs show `env:prod`, `service:profile-services`, `traceId`, and `spanId`.
- A request to `/api/health` creates an APM span named `HTTP GET /health` or its mounted route equivalent.
- A controlled 5xx marks the span as errored and increments `profile_services.http.errors`.
- Creating/updating a resume increments `profile_services.domain.events` with the expected `event_type`.
- No indexed metric tag contains `user_id`, `email`, `resume_id`, `job_id`, raw URL values, tokens, or document content.
