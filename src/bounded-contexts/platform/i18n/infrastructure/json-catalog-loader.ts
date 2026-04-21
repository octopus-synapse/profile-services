/**
 * JSON Catalog Loader
 *
 * Reads the `errors.<locale>.json` files from disk and produces a
 * fully-resolved lookup map `{ [locale]: { [code]: template } }`.
 *
 * Loaded once at module init — the catalogs are static JSON checked into
 * the repo. Zero runtime fetches; the i18n service never leaves the
 * process.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../domain/translation.port';

export type Catalog = Readonly<Record<string, string>>;
export type CatalogsByLocale = Readonly<Record<SupportedLocale, Catalog>>;

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

export function loadErrorCatalogs(): CatalogsByLocale {
  const out = {} as Record<SupportedLocale, Catalog>;
  for (const locale of SUPPORTED_LOCALES) {
    const file = path.join(MESSAGES_DIR, `errors.${locale}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing i18n catalog: ${file}`);
    }
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    out[locale] = Object.freeze(parsed);
  }
  return Object.freeze(out);
}
