import { describe, expect, it } from 'bun:test';
import { EmailNotVerifiedException } from '../../../domain/exceptions';
import { AssertEmailVerifiedUseCase } from './assert-email-verified.use-case';

describe('AssertEmailVerifiedUseCase', () => {
  const useCase = new AssertEmailVerifiedUseCase();

  it('returns void when emailVerified is true', () => {
    expect(() => useCase.execute(true)).not.toThrow();
  });

  it.each([
    false,
    null,
    undefined,
  ])('throws EmailNotVerifiedException when emailVerified is %p', (value) => {
    expect(() => useCase.execute(value)).toThrow(EmailNotVerifiedException);
  });
});
