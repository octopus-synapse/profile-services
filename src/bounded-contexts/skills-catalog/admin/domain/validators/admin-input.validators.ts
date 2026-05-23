/**
 * Pure-function validators for the admin CRUD payloads.
 *
 * The repositories accept `Record<string, unknown>` so the use cases
 * stay thin, but that shape gives us no compile-time guarantee that
 * required fields are present and well-formed. These validators run
 * before the repository call and throw the per-aggregate domain
 * exception (TechAreaInvalid / TechNicheInvalid / ProgrammingLanguage
 * Invalid) on the first issue found. Keeps all malformed-payload
 * mapping in one place rather than scattered across handlers.
 */

import {
  ProgrammingLanguageInvalidException,
  TechAreaInvalidException,
  TechNicheInvalidException,
} from '../../../domain/exceptions/skills-catalog.exceptions';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function reasonForName(input: Record<string, unknown>): string | null {
  const nameEn = input.nameEn;
  const namePtBr = input.namePtBr;
  if (typeof nameEn !== 'string' || nameEn.trim().length === 0) {
    return 'nameEn must be a non-empty string';
  }
  if (typeof namePtBr !== 'string' || namePtBr.trim().length === 0) {
    return 'namePtBr must be a non-empty string';
  }
  return null;
}

function reasonForSlug(input: Record<string, unknown>): string | null {
  const slug = input.slug;
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return 'slug must be lowercase alphanumeric with hyphens (e.g. "type-script")';
  }
  return null;
}

export function assertValidTechAreaInput(input: Record<string, unknown>): void {
  const reason = reasonForSlug(input) ?? reasonForName(input);
  if (reason) throw new TechAreaInvalidException(reason);
}

export function assertValidTechNicheInput(input: Record<string, unknown>): void {
  const reason = reasonForSlug(input) ?? reasonForName(input);
  if (reason) throw new TechNicheInvalidException(reason);
  if (typeof input.areaId !== 'string' || input.areaId.length === 0) {
    throw new TechNicheInvalidException('areaId must be a non-empty string');
  }
}

export function assertValidProgrammingLanguageInput(input: Record<string, unknown>): void {
  const reason = reasonForSlug(input) ?? reasonForName(input);
  if (reason) throw new ProgrammingLanguageInvalidException(reason);
}
