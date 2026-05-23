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
  return sanitizeHtml(input, {
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
