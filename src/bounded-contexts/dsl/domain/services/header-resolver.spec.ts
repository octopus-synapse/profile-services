import { describe, expect, it } from 'bun:test';
import {
  type ResumeHeaderOverrides,
  resolveHeader,
  type UserHeaderData,
  type VariantHeaderOverrides,
} from './header-resolver';

function makeUser(overrides: Partial<UserHeaderData> = {}): UserHeaderData {
  return {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1-555-0100',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/janedoe',
    github: 'github.com/janedoe',
    website: 'janedoe.dev',
    jobTitle: 'Software Engineer',
    ...overrides,
  };
}

describe('resolveHeader', () => {
  describe('user data passthrough', () => {
    it('should return all user fields when no overrides provided', () => {
      const user = makeUser();

      const result = resolveHeader(user);

      expect(result).toEqual({
        fullName: 'Jane Doe',
        jobTitle: 'Software Engineer',
        phone: '+1-555-0100',
        email: 'jane@example.com',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/janedoe',
        github: 'github.com/janedoe',
        website: 'janedoe.dev',
      });
    });

    it('should return null for missing user fields', () => {
      const user = makeUser({
        fullName: null,
        email: null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        jobTitle: null,
      });

      const result = resolveHeader(user);

      expect(result.fullName).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.location).toBeNull();
      expect(result.linkedin).toBeNull();
      expect(result.github).toBeNull();
      expect(result.website).toBeNull();
      expect(result.jobTitle).toBeNull();
    });
  });

  describe('resume jobTitle override', () => {
    it('should override user jobTitle with resume jobTitle', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = { jobTitle: 'Senior Engineer' };

      const result = resolveHeader(user, resume);

      expect(result.jobTitle).toBe('Senior Engineer');
    });

    it('should fall back to user jobTitle when resume jobTitle is null', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = { jobTitle: null };

      const result = resolveHeader(user, resume);

      expect(result.jobTitle).toBe('Software Engineer');
    });

    it('should fall back to user jobTitle when resume jobTitle is undefined', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = {};

      const result = resolveHeader(user, resume);

      expect(result.jobTitle).toBe('Software Engineer');
    });
  });

  describe('variant jobTitle override', () => {
    it('should override resume jobTitle with variant jobTitle', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = { jobTitle: 'Senior Engineer' };
      const variant: VariantHeaderOverrides = { jobTitle: 'Staff Engineer' };

      const result = resolveHeader(user, resume, variant);

      expect(result.jobTitle).toBe('Staff Engineer');
    });

    it('should override user jobTitle with variant jobTitle when no resume override', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const variant: VariantHeaderOverrides = { jobTitle: 'Staff Engineer' };

      const result = resolveHeader(user, undefined, variant);

      expect(result.jobTitle).toBe('Staff Engineer');
    });

    it('should fall back to resume jobTitle when variant jobTitle is null', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = { jobTitle: 'Senior Engineer' };
      const variant: VariantHeaderOverrides = { jobTitle: null };

      const result = resolveHeader(user, resume, variant);

      expect(result.jobTitle).toBe('Senior Engineer');
    });

    it('should fall back to user jobTitle when both variant and resume jobTitle are null', () => {
      const user = makeUser({ jobTitle: 'Software Engineer' });
      const resume: ResumeHeaderOverrides = { jobTitle: null };
      const variant: VariantHeaderOverrides = { jobTitle: null };

      const result = resolveHeader(user, resume, variant);

      expect(result.jobTitle).toBe('Software Engineer');
    });

    it('should return null when all levels have null jobTitle', () => {
      const user = makeUser({ jobTitle: null });
      const resume: ResumeHeaderOverrides = { jobTitle: null };
      const variant: VariantHeaderOverrides = { jobTitle: null };

      const result = resolveHeader(user, resume, variant);

      expect(result.jobTitle).toBeNull();
    });
  });

  describe('non-jobTitle fields always from user', () => {
    it('should source all non-jobTitle fields from user regardless of overrides', () => {
      const user = makeUser();
      const resume: ResumeHeaderOverrides = { jobTitle: 'Override Title' };
      const variant: VariantHeaderOverrides = { jobTitle: 'Variant Title' };

      const result = resolveHeader(user, resume, variant);

      expect(result.fullName).toBe(user.fullName);
      expect(result.email).toBe(user.email);
      expect(result.phone).toBe(user.phone);
      expect(result.location).toBe(user.location);
      expect(result.linkedin).toBe(user.linkedin);
      expect(result.github).toBe(user.github);
      expect(result.website).toBe(user.website);
    });
  });
});
