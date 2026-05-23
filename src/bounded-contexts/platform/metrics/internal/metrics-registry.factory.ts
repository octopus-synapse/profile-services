import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export interface MetricsRegistry {
  registry: Registry;
  counters: {
    resumeCreated: Counter<string>;
    userSignup: Counter<string>;
    exportCompleted: Counter<string>;
    scoreComputed: Counter<string>;
  };
  histograms: {
    exportDuration: Histogram<string>;
    apiLatency: Histogram<string>;
    scoreComputeDuration: Histogram<string>;
  };
  gauges: {
    activeUsers: Gauge<string>;
    pendingExports: Gauge<string>;
  };
}

export function createMetricsRegistry(): MetricsRegistry {
  const registry = new Registry();

  const counters = {
    resumeCreated: new Counter({
      name: 'resume_created_total',
      help: 'Total number of resumes created',
      labelNames: ['templateId'],
      registers: [registry],
    }),
    userSignup: new Counter({
      name: 'user_signup_total',
      help: 'Total number of user signups',
      labelNames: ['method'],
      registers: [registry],
    }),
    exportCompleted: new Counter({
      name: 'export_completed_total',
      help: 'Total number of exports completed',
      labelNames: ['format'],
      registers: [registry],
    }),
    scoreComputed: new Counter({
      name: 'score_computed_total',
      help: 'Scoring-subsystem computations completed, by score family and degradation outcome',
      labelNames: ['type', 'outcome'],
      registers: [registry],
    }),
  };

  const histograms = {
    exportDuration: new Histogram({
      name: 'export_duration_seconds',
      help: 'Duration of export operations in seconds',
      labelNames: ['format'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    }),
    apiLatency: new Histogram({
      name: 'api_latency_seconds',
      help: 'API request latency in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [registry],
    }),
    // Buckets fit cache-hit reads (~10ms) up to full match recomputes
    // that fan out to embeddings + LLM (~5–15s wall-clock).
    scoreComputeDuration: new Histogram({
      name: 'score_compute_duration_seconds',
      help: 'Wall-clock duration of a single scoring use-case execution',
      labelNames: ['type'],
      buckets: [0.01, 0.05, 0.25, 1, 3, 8, 20],
      registers: [registry],
    }),
  };

  const gauges = {
    activeUsers: new Gauge({
      name: 'active_users_total',
      help: 'Current number of active users',
      registers: [registry],
    }),
    pendingExports: new Gauge({
      name: 'pending_exports_total',
      help: 'Current number of pending exports',
      registers: [registry],
    }),
  };

  return { registry, counters, histograms, gauges };
}
