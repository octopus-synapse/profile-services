import sanitizeHtml from 'sanitize-html';

const DEFAULT_ALLOWED_TAGS: ReadonlyArray<string> = [
  'p',
  'br',
  'strong',
  'em',
  'a',
  'ul',
  'ol',
  'li',
];

const DEFAULT_ALLOWED_ATTRS: Readonly<Record<string, ReadonlyArray<string>>> = {
  a: ['href', 'rel', 'target'],
};

export interface SanitizeHtmlOptions {
  readonly allowedTags?: ReadonlyArray<string>;
  readonly allowedAttrs?: Readonly<Record<string, ReadonlyArray<string>>>;
}

/**
 * C0 control characters with no place in user text — NUL and friends —
 * excluding the legitimate whitespace `\t` (09), `\n` (0A), `\r` (0D).
 * A NUL byte in particular is rejected by Postgres (`invalid byte sequence
 * for encoding "UTF8": 0x00`) and, left unstripped, surfaces as an
 * unhandled 500 on the write path. `sanitize-html` only removes markup, so
 * we strip these ourselves as part of sanitization. Built via `new RegExp`
 * from an escaped string so no raw control byte appears in the source and
 * `noControlCharactersInRegex` (which only inspects regex literals) is moot.
 */
// biome-ignore lint/complexity/useRegexLiterals: a literal would embed raw control bytes / trip noControlCharactersInRegex
const CONTROL_CHARS_RE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g');

/**
 * Defense-in-depth HTML sanitization for user-supplied content. Backed by
 * `sanitize-html`, which parses the input into a proper DOM and re-emits
 * only the whitelisted nodes / attributes — unlike a regex strip
 * (P1 #21), it survives every well-known bypass (broken tags, encoded
 * payloads, `<svg onload>`, `javascript:` hrefs, malformed comments).
 *
 * The default allowlist is intentionally narrow: paragraph / linebreak /
 * basic inline emphasis / lists / anchors. `href` on `<a>` is restricted
 * to `http(s)` and `mailto` schemes by the library default; `javascript:`
 * is dropped.
 *
 * Pass `allowedTags: []` to strip ALL markup (plain-text use cases).
 */
export function sanitizeHtmlContent(input: string, opts?: SanitizeHtmlOptions): string {
  const allowedTags = (opts?.allowedTags ?? DEFAULT_ALLOWED_TAGS) as string[];
  const allowedAttributes = mutableAttrs(opts?.allowedAttrs ?? DEFAULT_ALLOWED_ATTRS);
  return sanitizeHtml(input.replace(CONTROL_CHARS_RE, ''), {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    disallowedTagsMode: 'discard',
  });
}

function mutableAttrs(
  src: Readonly<Record<string, ReadonlyArray<string>>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [tag, attrs] of Object.entries(src)) {
    out[tag] = [...attrs];
  }
  return out;
}
