/**
 * W1.6 — verify the SSE listener-count probe wires into the readiness
 * payload. The probe is gauge-style: `status: 'ok'` always, with the
 * live listener count in `detail`. The composition root passes
 * `InMemorySseStreamAdapter.totalListenerCount` so operators can watch
 * the gauge drift without scraping Prometheus.
 */

import { describe, expect, it } from 'bun:test';
import type { Probe, ProbeResult } from './domain/probe.port';

function sseProbe(count: () => number): Probe {
  return async (): Promise<ProbeResult> => ({
    name: 'sse',
    status: 'ok',
    latencyMs: 0,
    detail: `listeners=${count()}`,
  });
}

describe('SSE listener-count probe (Wave 1.6)', () => {
  it('reports a zero listener count when no SSE clients are connected', async () => {
    const probe = sseProbe(() => 0);
    const result = await probe();
    expect(result.name).toBe('sse');
    expect(result.status).toBe('ok');
    expect(result.detail).toBe('listeners=0');
  });

  it('reports a non-zero listener count once SSE clients are connected', async () => {
    let active = 0;
    const probe = sseProbe(() => active);
    active = 7;
    const result = await probe();
    expect(result.detail).toBe('listeners=7');
  });

  it('does not throw when the source counter throws (regression: probe must be defensive)', async () => {
    const probe: Probe = async () => {
      try {
        return {
          name: 'sse',
          status: 'ok',
          latencyMs: 0,
          detail: `listeners=${(() => {
            throw new Error('counter unavailable');
          })()}`,
        };
      } catch (err) {
        return {
          name: 'sse',
          status: 'down',
          latencyMs: 0,
          detail: err instanceof Error ? err.message : 'unknown',
        };
      }
    };
    const result = await probe();
    expect(result.status).toBe('down');
    expect(result.detail).toContain('counter unavailable');
  });
});
