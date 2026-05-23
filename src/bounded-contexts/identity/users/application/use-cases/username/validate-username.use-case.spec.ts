import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUsernameRepository } from '../../../testing/in-memory-username.repository';
import { ValidateUsernameUseCase } from './validate-username.use-case';

describe('ValidateUsernameUseCase', () => {
  let repository: InMemoryUsernameRepository;
  let useCase: ValidateUsernameUseCase;

  beforeEach(() => {
    repository = new InMemoryUsernameRepository();
    useCase = new ValidateUsernameUseCase(repository);
  });

  function codes(errors: ReadonlyArray<{ code: string }>): string[] {
    return errors.map((e) => e.code);
  }

  it('returns valid + available for a well-formed name no one has claimed', async () => {
    const result = await useCase.execute('johndoe');

    expect(result.valid).toBe(true);
    expect(result.available).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.username).toBe('johndoe');
  });

  it('returns USERNAME_MUST_BE_LOWERCASE for any uppercase character', async () => {
    const result = await useCase.execute('JohnDoe');

    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('USERNAME_MUST_BE_LOWERCASE');
  });

  it('returns USERNAME_TOO_SHORT with min=3 param for sub-minimum lengths', async () => {
    const result = await useCase.execute('jd');

    expect(result.valid).toBe(false);
    const tooShort = result.errors.find((e) => e.code === 'USERNAME_TOO_SHORT');
    expect(tooShort).toEqual({ code: 'USERNAME_TOO_SHORT', params: { min: 3 } });
  });

  it('returns USERNAME_TOO_LONG with max=30 param for over-maximum lengths', async () => {
    const result = await useCase.execute('a'.repeat(31));

    expect(result.valid).toBe(false);
    const tooLong = result.errors.find((e) => e.code === 'USERNAME_TOO_LONG');
    expect(tooLong).toEqual({ code: 'USERNAME_TOO_LONG', params: { max: 30 } });
  });

  it('returns USERNAME_INVALID_FORMAT for special characters', async () => {
    const result = await useCase.execute('john@doe');

    expect(codes(result.errors)).toContain('USERNAME_INVALID_FORMAT');
  });

  it('returns USERNAME_INVALID_START when the name starts with a number or underscore', async () => {
    const startsWithNumber = await useCase.execute('1johndoe');
    const startsWithUnderscore = await useCase.execute('_johndoe');

    expect(codes(startsWithNumber.errors)).toContain('USERNAME_INVALID_START');
    expect(codes(startsWithUnderscore.errors)).toContain('USERNAME_INVALID_START');
  });

  it('returns USERNAME_INVALID_END when the name ends with an underscore', async () => {
    const result = await useCase.execute('johndoe_');

    expect(codes(result.errors)).toContain('USERNAME_INVALID_END');
  });

  it('returns USERNAME_CONSECUTIVE_UNDERSCORES for double underscores', async () => {
    const result = await useCase.execute('john__doe');

    expect(codes(result.errors)).toContain('USERNAME_CONSECUTIVE_UNDERSCORES');
  });

  it('returns USERNAME_RESERVED for protected names', async () => {
    const result = await useCase.execute('admin');

    expect(codes(result.errors)).toContain('USERNAME_RESERVED');
  });

  it('returns USERNAME_TAKEN when the format passes but the repository reports a clash', async () => {
    repository.seedUser({ id: 'someone', username: 'johndoe' });

    const result = await useCase.execute('johndoe');

    expect(result.valid).toBe(false);
    expect(result.available).toBe(false);
    expect(codes(result.errors)).toEqual(['USERNAME_TAKEN']);
  });

  it('skips the availability check when the format is invalid (saves a DB roundtrip)', async () => {
    const result = await useCase.execute('jd');

    expect(result.available).toBeUndefined();
  });

  it('lets the requester re-claim their own username (excludes their userId from the takeness check)', async () => {
    repository.seedUser({ id: 'me', username: 'johndoe' });

    const result = await useCase.execute('johndoe', 'me');

    expect(result.valid).toBe(true);
    expect(result.available).toBe(true);
  });

  it('normalizes whitespace and case before reporting back', async () => {
    const result = await useCase.execute('  JohnDoe  ');

    // Trim happens; lower-case happens; the lowercase check still fires
    // because the trimmed form differs from the lowered form.
    expect(result.username).toBe('johndoe');
    expect(codes(result.errors)).toContain('USERNAME_MUST_BE_LOWERCASE');
  });

  it('aggregates multiple format errors in a single response (multi-error UX)', async () => {
    const result = await useCase.execute('Ab__');

    // Ab__ → too-short (4 chars OK actually, let's compute: 'Ab__' is 4 chars,
    // but ends with '_' so INVALID_END, has '__' so CONSECUTIVE_UNDERSCORES,
    // and has 'A' so MUST_BE_LOWERCASE.
    expect(codes(result.errors).sort()).toEqual(
      [
        'USERNAME_CONSECUTIVE_UNDERSCORES',
        'USERNAME_INVALID_END',
        'USERNAME_MUST_BE_LOWERCASE',
      ].sort(),
    );
  });
});
