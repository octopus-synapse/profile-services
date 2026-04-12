import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  UpdateProfileData,
  UserProfile,
  UserProfileRepositoryPort,
} from '../../ports/user-profile.port';
import { UpdateProfileUseCase } from './update-profile.use-case';

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'johndoe',
  name: 'John Doe',
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

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let repository: UserProfileRepositoryPort;

  const updateData: UpdateProfileData = {
    name: 'Jane Doe',
    bio: 'Updated bio',
    location: 'LA',
  };

  const updatedProfile: UserProfile = {
    ...mockProfile,
    name: 'Jane Doe',
    bio: 'Updated bio',
    location: 'LA',
    updatedAt: new Date('2024-07-01'),
  };

  beforeEach(() => {
    repository = {
      findUserById: mock(async () => ({ id: 'user-1' })),
      updateUserProfile: mock(async () => updatedProfile),
      findUserProfileById: mock(async () => mockProfile),
      findUserByUsername: mock(async () => null),
      findResumeByUserId: mock(async () => null),
    } as UserProfileRepositoryPort;

    useCase = new UpdateProfileUseCase(repository);
  });

  it('updates the profile and returns updated domain entity', async () => {
    const result = await useCase.execute('user-1', updateData);

    expect(repository.findUserById).toHaveBeenCalledWith('user-1');
    expect(repository.updateUserProfile).toHaveBeenCalledWith('user-1', updateData);
    expect(result).toEqual(updatedProfile);
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.findUserById = mock(async () => null);

    await expect(useCase.execute('non-existent', updateData)).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('does not call updateUserProfile when user is not found', async () => {
    repository.findUserById = mock(async () => null);

    try {
      await useCase.execute('non-existent', updateData);
    } catch {
      // expected
    }

    expect(repository.updateUserProfile).not.toHaveBeenCalled();
  });

  it('returns domain entity, not envelope', async () => {
    const result = await useCase.execute('user-1', updateData);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('email');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
