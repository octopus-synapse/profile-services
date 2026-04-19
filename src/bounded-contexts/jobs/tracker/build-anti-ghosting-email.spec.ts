import { describe, expect, it } from 'bun:test';
import { buildAntiGhostingEmail } from './build-anti-ghosting-email';

describe('buildAntiGhostingEmail', () => {
  it('uses the 7-day copy at 7 days of silence', () => {
    const out = buildAntiGhostingEmail({
      userName: 'Enzo',
      jobTitle: 'Backend Engineer',
      company: 'Acme',
      daysSilent: 7,
    });
    expect(out.text).toContain('week');
    expect(out.subject).toContain('7 days');
  });

  it('uses the 14-day copy at 14 days of silence', () => {
    const out = buildAntiGhostingEmail({
      userName: 'Enzo',
      jobTitle: 'Backend',
      company: 'Acme',
      daysSilent: 14,
    });
    expect(out.text.toLowerCase()).toContain('two weeks');
  });

  it('uses the 21-day copy at 21+ days of silence', () => {
    const out = buildAntiGhostingEmail({
      userName: 'Enzo',
      jobTitle: 'Backend',
      company: 'Acme',
      daysSilent: 21,
    });
    expect(out.text.toLowerCase()).toContain('three weeks');
  });

  it('escapes HTML-special characters in job title and company', () => {
    const out = buildAntiGhostingEmail({
      userName: 'Enzo',
      jobTitle: 'Backend <Eng>',
      company: 'A&B',
      daysSilent: 7,
    });
    expect(out.html).not.toContain('<Eng>');
    expect(out.html).toContain('&lt;Eng&gt;');
    expect(out.html).toContain('A&amp;B');
  });

  it('falls back to generic greeting when name is missing', () => {
    const out = buildAntiGhostingEmail({
      userName: null,
      jobTitle: 'Backend',
      company: 'Acme',
      daysSilent: 7,
    });
    expect(out.text).toContain('Hi there');
  });
});
