/**
 * Overlay a tailored ResumeVersion's rewrites onto a rendered resume AST.
 *
 * A tailored snapshot stores `{ master, tailored }` where each side has
 * `summary` / `jobTitle` / `bullets` (bullets pair `original` → `tailored`
 * text). The AST is produced from the CURRENT master, so the overlay works
 * by exact-text substitution on string leaves: wherever the AST carries the
 * master's summary, job title, or a bullet's original text, the tailored
 * counterpart is substituted. A non-matching entry no-ops (the master
 * changed since tailor-time) — the export still succeeds with the texts
 * that do match, never with fabricated content.
 *
 * Deep-walks any JSON-ish structure, returning a new value; the input AST
 * is not mutated.
 */

type TailoredSnapshotLike = {
  master?: { summary?: unknown; jobTitle?: unknown };
  tailored?: {
    summary?: unknown;
    jobTitle?: unknown;
    bullets?: Array<{ original?: unknown; tailored?: unknown }>;
  };
};

export function applyTailoredSnapshotToAst<T>(ast: T, snapshot: unknown): T {
  const replacements = buildReplacements(snapshot);
  if (replacements.size === 0) return ast;
  return walk(ast, replacements) as T;
}

function buildReplacements(snapshot: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!snapshot || typeof snapshot !== 'object') return map;
  const { master, tailored } = snapshot as TailoredSnapshotLike;

  const add = (before: unknown, after: unknown): void => {
    if (typeof before !== 'string' || typeof after !== 'string') return;
    const key = before.trim();
    if (key.length === 0 || key === after) return;
    map.set(key, after);
  };

  add(master?.summary, tailored?.summary);
  add(master?.jobTitle, tailored?.jobTitle);
  for (const bullet of tailored?.bullets ?? []) {
    add(bullet.original, bullet.tailored);
  }
  return map;
}

function walk(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return replacements.get(value.trim()) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => walk(entry, replacements));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = walk(entry, replacements);
    }
    return out;
  }
  return value;
}
