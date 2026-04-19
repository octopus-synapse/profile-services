import { describe, expect, it } from 'bun:test';
import { buildTimeCapsuleEmail, diffSnapshots } from './build-time-capsule-email';

describe('diffSnapshots', () => {
  it('returns zeros when both snapshots are empty', () => {
    const diff = diffSnapshots({}, {});
    expect(diff.skillsAdded).toBe(0);
    expect(diff.skillsRemoved).toBe(0);
    expect(diff.experiencesAdded).toBe(0);
    expect(diff.titleChanged).toBe(false);
  });

  it('counts skills added and removed case-insensitively', () => {
    const older = {
      sections: [{ semanticKind: 'SKILL_SET', items: [{ name: 'TypeScript' }, { name: 'SQL' }] }],
    };
    const current = {
      sections: [{ semanticKind: 'SKILL_SET', items: [{ name: 'typescript' }, { name: 'Rust' }] }],
    };
    const diff = diffSnapshots(older, current);
    expect(diff.skillsAdded).toBe(1); // Rust
    expect(diff.skillsRemoved).toBe(1); // SQL
  });

  it('counts experiences added', () => {
    const older = { sections: [{ semanticKind: 'WORK_EXPERIENCE', items: [{ title: 'a' }] }] };
    const current = {
      sections: [
        {
          semanticKind: 'WORK_EXPERIENCE',
          items: [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
        },
      ],
    };
    const diff = diffSnapshots(older, current);
    expect(diff.experiencesAdded).toBe(2);
  });

  it('flags title change and surfaces both values', () => {
    const diff = diffSnapshots({ title: 'Junior Dev' }, { title: 'Senior Engineer' });
    expect(diff.titleChanged).toBe(true);
    expect(diff.oldTitle).toBe('Junior Dev');
    expect(diff.newTitle).toBe('Senior Engineer');
  });
});

describe('buildTimeCapsuleEmail', () => {
  const baseDiff = {
    skillsAdded: 3,
    skillsRemoved: 0,
    experiencesAdded: 1,
    sectionsAdded: 0,
    titleChanged: true,
    oldTitle: 'Junior',
    newTitle: 'Senior',
  };

  it('returns null when diff is completely empty', () => {
    const out = buildTimeCapsuleEmail({
      userName: 'Enzo',
      snapshotYear: 2025,
      diff: {
        skillsAdded: 0,
        skillsRemoved: 0,
        experiencesAdded: 0,
        sectionsAdded: 0,
        titleChanged: false,
        oldTitle: null,
        newTitle: null,
      },
    });
    expect(out).toBeNull();
  });

  it('mentions each non-zero counter', () => {
    const out = buildTimeCapsuleEmail({ userName: 'Enzo', snapshotYear: 2025, diff: baseDiff });
    expect(out).not.toBeNull();
    expect(out?.text).toContain('3 new skills');
    expect(out?.text).toContain('1 new experience');
    expect(out?.text).toContain('Junior');
    expect(out?.text).toContain('Senior');
  });

  it('escapes HTML in user name', () => {
    const out = buildTimeCapsuleEmail({
      userName: 'Enzo <b>',
      snapshotYear: 2025,
      diff: baseDiff,
    });
    expect(out?.html).not.toContain('<b>');
    expect(out?.html).toContain('&lt;b&gt;');
  });
});
