import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserProfileRepositoryPort } from '../../ports/user-profile.port';
import { GetPublicProfileUseCase } from './get-public-profile.use-case';

const mockFoundUser = {
  id: 'user-1',
  displayName: 'John Doe',
  photoURL: 'https://example.com/photo.jpg',
  bio: 'A developer',
  location: 'NYC',
  website: 'https://johndoe.com',
  linkedin: 'johndoe',
  github: 'johndoe',
  preferences: { profileVisibility: 'public' },
};

const mockResume = { sections: ['education', 'experience'] };

describe('GetPublicProfileUseCase', () => {
  let useCase: GetPublicProfileUseCase;
  let repository: UserProfileRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserByUsername: mock(async () => mockFoundUser),
      findResumeByUserId: mock(async () => mockResume),
      findUserProfileById: mock(async () => null),
      findUserById: mock(async () => ({ id: 'user-1' })),
      updateUserProfile: mock(async () => ({}) as unknown),
    } as UserProfileRepositoryPort;

    useCase = new GetPublicProfileUseCase(repository);
  });

  it('returns public profile data for a public user', async () => {
    const result = await useCase.execute('johndoe');

    expect(result.user).toEqual({
      displayName: 'John Doe',
      photoURL: 'https://example.com/photo.jpg',
      bio: 'A developer',
      location: 'NYC',
      website: 'https://johndoe.com',
      linkedin: 'johndoe',
      github: 'johndoe',
    });
    expect(result.resume).toEqual(mockResume);
    expect(repository.findUserByUsername).toHaveBeenCalledWith('johndoe');
    expect(repository.findResumeByUserId).toHaveBeenCalledWith('user-1');
  });

  it('throws EntityNotFoundException when user is not found', async () => {
    repository.findUserByUsername = mock(async () => null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws EntityNotFoundException when profile is not public', async () => {
    repository.findUserByUsername = mock(async () => ({
      ...mockFoundUser,
      preferences: { profileVisibility: 'private' },
    }));

    await expect(useCase.execute('johndoe')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws EntityNotFoundException when preferences are null', async () => {
    repository.findUserByUsername = mock(async () => ({
      ...mockFoundUser,
      preferences: null,
    }));

    await expect(useCase.execute('johndoe')).rejects.toThrow(EntityNotFoundException);
  });

  it('returns domain entity, not envelope', async () => {
    const result = await useCase.execute('johndoe');

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('resume');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
