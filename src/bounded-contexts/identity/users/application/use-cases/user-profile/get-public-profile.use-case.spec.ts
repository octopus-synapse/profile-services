import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { UserProfileRepositoryPort } from '../../ports/user-profile.port';
import { GetPublicProfileUseCase } from './get-public-profile.use-case';

const mockFoundUser = {
  id: 'user-1',
  username: 'johndoe',
  name: 'John Doe',
  photoURL: 'https://example.com/photo.jpg',
  bio: 'A developer',
  location: 'NYC',
  website: 'https://johndoe.com',
  linkedin: 'johndoe',
  github: 'johndoe',
};

const mockResume = {
  id: 'resume-1',
  title: 'My Resume',
  language: 'en',
  isPublic: true,
  slug: 'my-resume',
  fullName: 'John Doe',
  jobTitle: 'Engineer',
  phone: null,
  location: 'NYC',
  linkedin: 'johndoe',
  github: 'johndoe',
  website: 'https://johndoe.com',
  summary: 'Cool dev',
  accentColor: '#3B82F6',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  sections: ['education', 'experience'],
};

const mockResumeProjection = {
  id: 'resume-1',
  title: 'My Resume',
  language: 'en',
  isPublic: true,
  slug: 'my-resume',
  fullName: 'John Doe',
  jobTitle: 'Engineer',
  phone: null,
  location: 'NYC',
  linkedin: 'johndoe',
  github: 'johndoe',
  website: 'https://johndoe.com',
  summary: 'Cool dev',
  accentColor: '#3B82F6',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

describe('GetPublicProfileUseCase', () => {
  let useCase: GetPublicProfileUseCase;
  let repository: UserProfileRepositoryPort;

  beforeEach(() => {
    repository = {
      findUserByUsername: mock(async () => mockFoundUser),
      findResumeByUserId: mock(async () => mockResume),
      findUserProfileById: mock(async () => null),
      findUserById: mock(async () => ({ id: 'user-1' })),
      updateUserProfile: mock(async () => ({
        id: 'user-1',
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      listPublicUsers: mock(async () => ({ items: [], total: 0 })),
    } as UserProfileRepositoryPort;

    useCase = new GetPublicProfileUseCase(repository);
  });

  it('returns public profile data for a public user', async () => {
    const result = await useCase.execute('johndoe');

    expect(result.user).toEqual({
      id: 'user-1',
      username: 'johndoe',
      name: 'John Doe',
      photoURL: 'https://example.com/photo.jpg',
      bio: 'A developer',
      location: 'NYC',
      website: 'https://johndoe.com',
      linkedin: 'johndoe',
      github: 'johndoe',
    });
    expect(result.resume).toEqual(mockResumeProjection);
    expect(repository.findUserByUsername).toHaveBeenCalledWith('johndoe');
    expect(repository.findResumeByUserId).toHaveBeenCalledWith('user-1');
  });

  it('throws EntityNotFoundException when user is not found', async () => {
    repository.findUserByUsername = mock(async () => null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(EntityNotFoundException);
  });

  it('returns domain entity, not envelope', async () => {
    const result = await useCase.execute('johndoe');

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('resume');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('message');
  });
});
