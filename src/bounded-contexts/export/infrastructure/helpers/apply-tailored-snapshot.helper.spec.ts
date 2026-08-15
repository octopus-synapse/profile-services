import { describe, expect, it } from 'bun:test';
import { applyTailoredSnapshotToAst } from './apply-tailored-snapshot.helper';

const snapshot = {
  master: {
    summary: 'Fullstack dev with 5 years of experience.',
    jobTitle: 'Fullstack Engineer',
    bullets: [{ id: 'b1', content: 'Built features.' }],
  },
  tailored: {
    summary: 'Frontend dev specialized in React and TypeScript.',
    jobTitle: 'Frontend Developer',
    bullets: [
      {
        id: 'b1',
        original: 'Built features.',
        tailored: 'Built React features with tests.',
        highlights: ['react'],
      },
    ],
  },
};

describe('applyTailoredSnapshotToAst', () => {
  it('substitutes summary, job title, and bullet texts wherever they appear', () => {
    const ast = {
      header: { role: 'Fullstack Engineer' },
      blocks: [
        { kind: 'summary', text: 'Fullstack dev with 5 years of experience.' },
        { kind: 'item', lines: ['Built features.', 'Untouched line.'] },
      ],
    };
    const result = applyTailoredSnapshotToAst(ast, snapshot);
    expect(result.header.role).toBe('Frontend Developer');
    expect(result.blocks[0]?.text).toBe('Frontend dev specialized in React and TypeScript.');
    expect(result.blocks[1]?.lines).toEqual([
      'Built React features with tests.',
      'Untouched line.',
    ]);
  });

  it('does not mutate the input AST', () => {
    const ast = { role: 'Fullstack Engineer' };
    applyTailoredSnapshotToAst(ast, snapshot);
    expect(ast.role).toBe('Fullstack Engineer');
  });

  it('no-ops on texts the master changed since tailor-time', () => {
    const ast = { text: 'A newer bullet the snapshot never saw.' };
    expect(applyTailoredSnapshotToAst(ast, snapshot).text).toBe(
      'A newer bullet the snapshot never saw.',
    );
  });

  it('tolerates malformed snapshots', () => {
    const ast = { text: 'Anything' };
    expect(applyTailoredSnapshotToAst(ast, null)).toEqual(ast);
    expect(applyTailoredSnapshotToAst(ast, { tailored: { bullets: [{}] } })).toEqual(ast);
  });
});
