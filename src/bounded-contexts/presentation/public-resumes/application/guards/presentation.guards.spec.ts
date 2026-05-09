/**
 * Presentation guard helpers — unit tests.
 *
 * Covers the typed-throw surface (`ONLY_ADMINS_CAN_DO_THIS` and
 * `SECTION_NOT_FOUND_IN_RESUME`) so the envelope carries stable codes
 * for handlers that delegate authorization / section lookup to the
 * application layer.
 */

import { describe, expect, it } from 'bun:test';
import {
  OnlyAdminsCanDoThisException,
  SectionNotFoundInResumeException,
} from '../../../domain/exceptions';
import { requireAdmin, requireSection } from './presentation.guards';

describe('requireAdmin', () => {
  it('throws OnlyAdminsCanDoThisException when user is null', () => {
    expect(() => requireAdmin(null)).toThrow(OnlyAdminsCanDoThisException);
  });

  it('throws when user lacks admin role and isAdmin flag', () => {
    expect(() => requireAdmin({ roles: ['user'] })).toThrow(OnlyAdminsCanDoThisException);
  });

  it('passes when isAdmin flag is true', () => {
    expect(() => requireAdmin({ isAdmin: true })).not.toThrow();
  });

  it('passes when roles contain "admin"', () => {
    expect(() => requireAdmin({ roles: ['user', 'admin'] })).not.toThrow();
  });
});

describe('requireSection', () => {
  const sections = [
    { semanticKind: 'experience', items: [] },
    { semanticKind: 'education', items: [] },
  ];

  it('throws SectionNotFoundInResumeException with the missing kind', () => {
    expect(() => requireSection(sections, 'projects')).toThrow(SectionNotFoundInResumeException);
  });

  it('returns the matching section when present', () => {
    const section = requireSection(sections, 'experience');
    expect(section.semanticKind).toBe('experience');
  });
});
