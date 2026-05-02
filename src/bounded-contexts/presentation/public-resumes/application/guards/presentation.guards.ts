/**
 * Presentation BC guard helpers.
 *
 * Pure functions that surface typed throws from the
 * `presentation.exceptions` catalogue:
 *   - `OnlyAdminsCanDoThisException` for admin-only operations whose
 *     permission decoration was missed at the route layer.
 *   - `SectionNotFoundInResumeException` for section lookups against a
 *     hydrated public-resume payload (used by deep-link handlers that
 *     navigate to a specific section of a shared resume).
 */

import {
  OnlyAdminsCanDoThisException,
  SectionNotFoundInResumeException,
} from '../../../domain/exceptions/presentation.exceptions';

export interface AdminCheckable {
  readonly isAdmin?: boolean;
  readonly roles?: readonly string[];
}

/**
 * Throws `OnlyAdminsCanDoThisException` unless the caller has the
 * `admin` role or explicit `isAdmin` flag. Routes already carry a
 * `permission: Permission.ADMIN_FULL_ACCESS` decoration; this guard is
 * the application-layer fallback for use cases shared between admin
 * and non-admin surfaces.
 */
export function requireAdmin(user: AdminCheckable | null | undefined): void {
  const isAdmin = user?.isAdmin === true || user?.roles?.includes('admin') === true;
  if (!isAdmin) {
    throw new OnlyAdminsCanDoThisException();
  }
}

export interface SectionLike {
  readonly semanticKind: string;
}

/**
 * Returns the section matching `semanticKind` or throws
 * `SectionNotFoundInResumeException(semanticKind)`. Used by deep-link
 * handlers that target a specific section of a public resume.
 */
export function requireSection<TSection extends SectionLike>(
  sections: readonly TSection[],
  semanticKind: string,
): TSection {
  const section = sections.find((s) => s.semanticKind === semanticKind);
  if (!section) {
    throw new SectionNotFoundInResumeException(semanticKind);
  }
  return section;
}
