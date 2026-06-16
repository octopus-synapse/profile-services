/**
 * WCAG contrast ratio helpers — pure, dependency-free.
 *
 * Used by the contrast bucket of the Style Score rubric to verify that a
 * template's text colours are legible (and therefore ATS/OCR-safe) over
 * its background. Implements the WCAG 2.1 relative-luminance formula.
 */

/** Parse `#RGB` / `#RRGGBB` (case-insensitive) into [r,g,b] 0-255. Returns
 * null for anything we can't read so callers can decide how to score it. */
export function parseHexColor(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * WCAG contrast ratio between two hex colours, in the range [1, 21].
 * Returns null when either colour can't be parsed.
 */
export function contrastRatio(foreground: unknown, background: unknown): number | null {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
