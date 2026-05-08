export const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
export const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
export const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
export const FIXTURE_POST_ID = '01900000-0000-7000-a000-000000000040';
export const FIXTURE_CONVERSATION_ID = '01900000-0000-7000-a000-000000000050';
export const FIXTURE_NOTIFICATION_ID = '01900000-0000-7000-a000-000000000060';
export const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';
export const FIXTURE_SLUG = 'fixture-slug';

export const SENTINEL_USER_ID = '00000000-0000-0000-0000-000000000001';
export const SENTINEL_GENERIC_ID = '00000000-0000-0000-0000-000000000000';
export const SENTINEL_SLUG = 'sentinel-nonexistent';

export function fillPathParams(path: string, paramOverrides?: Record<string, unknown>): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    const override = paramOverrides?.[name];
    if (override !== undefined && override !== null) return String(override);
    if (name === 'userId') return FIXTURE_USER_ID;
    if (name === 'resumeId') return FIXTURE_RESUME_ID;
    if (name === 'jobId') return FIXTURE_JOB_ID;
    if (name === 'postId') return FIXTURE_POST_ID;
    if (name === 'conversationId') return FIXTURE_CONVERSATION_ID;
    if (name === 'notificationId') return FIXTURE_NOTIFICATION_ID;
    if (name.endsWith('Id') || name === 'id') return FIXTURE_GENERIC_ID;
    return FIXTURE_SLUG;
  });
}

export function buildQueryString(query: unknown): string {
  if (!query || typeof query !== 'object') return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function fillSentinelParams(path: string): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (name === 'userId') return SENTINEL_USER_ID;
    if (name.endsWith('Id') || name === 'id') return SENTINEL_GENERIC_ID;
    return SENTINEL_SLUG;
  });
}
