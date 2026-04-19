import { describe, expect, it } from 'bun:test';
import { buildWeeklyDigest } from './build-weekly-digest';

const baseInput = {
  userName: 'Enzo',
  stats: {
    resumeViews: 12,
    newFollowers: 3,
    newEndorsements: 2,
    profileViews: 8,
  },
};

describe('buildWeeklyDigest', () => {
  it('returns null when there is nothing to say', () => {
    const result = buildWeeklyDigest({
      userName: 'Enzo',
      stats: { resumeViews: 0, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });

    expect(result).toBeNull();
  });

  it('produces subject / html / text when at least one stat is non-zero', () => {
    const result = buildWeeklyDigest({
      userName: 'Enzo',
      stats: { resumeViews: 1, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });

    expect(result).not.toBeNull();
    expect(result?.subject).toContain('Patch Careers');
    expect(typeof result?.html).toBe('string');
    expect(typeof result?.text).toBe('string');
  });

  it('mentions every non-zero counter in the text body', () => {
    const result = buildWeeklyDigest(baseInput);

    expect(result?.text).toContain('12');
    expect(result?.text).toContain('3');
    expect(result?.text).toContain('2');
    expect(result?.text).toContain('8');
  });

  it('greets the user by name when provided', () => {
    const result = buildWeeklyDigest(baseInput);
    expect(result?.html).toContain('Enzo');
    expect(result?.text).toContain('Enzo');
  });

  it('falls back to a generic greeting when name is missing', () => {
    const result = buildWeeklyDigest({
      userName: null,
      stats: { resumeViews: 5, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });
    expect(result?.html).toContain('Hi');
  });

  it('escapes HTML-special characters in the user name', () => {
    const result = buildWeeklyDigest({
      userName: 'Enzo <script>alert(1)</script>',
      stats: { resumeViews: 5, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });
    expect(result?.html).not.toContain('<script>');
    expect(result?.html).toContain('&lt;script&gt;');
  });

  it('singularises "view" when there is exactly one', () => {
    const result = buildWeeklyDigest({
      userName: 'Enzo',
      stats: { resumeViews: 1, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });
    expect(result?.text).toMatch(/\b1 resume view\b/);
  });

  it('pluralises "views" when there is more than one', () => {
    const result = buildWeeklyDigest({
      userName: 'Enzo',
      stats: { resumeViews: 5, newFollowers: 0, newEndorsements: 0, profileViews: 0 },
    });
    expect(result?.text).toMatch(/\b5 resume views\b/);
  });
});
