import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserProfile, UserProfileRepositoryPort } from '../../ports/user-profile.port';
import { GetProfileUseCase } from './get-profile.use-case';

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'johndoe',
  displayName: 'John Doe',
  photoURL: null,
  bio: 'A developer',
  location: 'NYC',
  phone: null,
  website: null,
  linkedin: null,
  github: null,
  twitter: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
};

describe('GetProfileUseCase', () => {
  let useCase: GetProfileUseCase;
  let repository: UserProfileRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserProfileById: mock(async () => mockProfile),
      findUserByUsername: mock(async () => null),
      findResumeByUserId: mock(async () => null),
      findUserById: mock(async () => ({ id: 'user-1' })),
      updateUserProfile: mock(async () => mockProfile),
    } as UserProfileRepositoryPort;

    useCase = new GetProfileUseCase(repository);
  });

  it('returns the user profile for a valid userId', async () => {
    const result = await useCase.execute('user-1');

    expect(result).toEqual(mockProfile);
    expect(repository.findUserProfileById).toHaveBeenCalledWith('user-1');
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.findUserProfileById = mock(async () => null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(EntityNotFoundException);
  });

  it('returns domain entity, not envelope', async () => {
    const result = await useCase.execute('user-1');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('email');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
