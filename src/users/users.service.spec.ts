import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UsernameService } from './services/username.service';

describe('UsersService', () => {
  let service: UsersService;
  let profileService: jest.Mocked<UserProfileService>;
  let preferencesService: jest.Mocked<UserPreferencesService>;
  let usernameService: jest.Mocked<UsernameService>;

  const mockProfileService = {
    getPublicProfileByUsername: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  const mockPreferencesService = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getFullPreferences: jest.fn(),
    updateFullPreferences: jest.fn(),
  };

  const mockUsernameService = {
    updateUsername: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserProfileService,
          useValue: mockProfileService,
        },
        {
          provide: UserPreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: UsernameService,
          useValue: mockUsernameService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    profileService = module.get(UserProfileService);
    preferencesService = module.get(UserPreferencesService);
    usernameService = module.get(UsernameService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicProfileByUsername', () => {
    it('should delegate to profileService', async () => {
      const username = 'publicuser';
      const mockResult = {
        user: { id: 'user-1', displayName: 'Public User' },
        resume: { id: 'resume-1', title: 'Public Resume' },
      };
      mockProfileService.getPublicProfileByUsername.mockResolvedValue(
        mockResult,
      );

      const result = await service.getPublicProfileByUsername(username);

      expect(result).toEqual(mockResult);
      expect(profileService.getPublicProfileByUsername).toHaveBeenCalledWith(
        username,
      );
    });
  });

  describe('getProfile', () => {
    it('should delegate to profileService', async () => {
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        displayName: 'Test',
      };
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(profileService.getProfile).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    it('should delegate to profileService', async () => {
      const userId = 'user-123';
      const updateProfileDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };
      const mockResult = {
        success: true,
        user: { displayName: 'Updated Name' },
      };
      mockProfileService.updateProfile.mockResolvedValue(mockResult);

      const result = await service.updateProfile(userId, updateProfileDto);

      expect(result).toEqual(mockResult);
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateProfileDto,
      );
    });
  });

  describe('getPreferences', () => {
    it('should delegate to preferencesService', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        palette: 'blue',
        bannerColor: '#1a1a1a',
      };
      mockPreferencesService.getPreferences.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(userId);

      expect(result).toEqual(mockPreferences);
      expect(preferencesService.getPreferences).toHaveBeenCalledWith(userId);
    });
  });

  describe('updatePreferences', () => {
    it('should delegate to preferencesService', async () => {
      const userId = 'user-123';
      const updatePreferencesDto = {
        palette: 'green',
        bannerColor: '#2a2a2a',
      };
      const mockResult = {
        success: true,
        message: 'Preferences updated successfully',
      };
      mockPreferencesService.updatePreferences.mockResolvedValue(mockResult);

      const result = await service.updatePreferences(
        userId,
        updatePreferencesDto,
      );

      expect(result).toEqual(mockResult);
      expect(preferencesService.updatePreferences).toHaveBeenCalledWith(
        userId,
        updatePreferencesDto,
      );
    });
  });

  describe('getFullPreferences', () => {
    it('should delegate to preferencesService', async () => {
      const userId = 'user-123';
      const mockFullPreferences = {
        theme: 'dark',
        palette: 'blue',
        language: 'en',
      };
      mockPreferencesService.getFullPreferences.mockResolvedValue(
        mockFullPreferences,
      );

      const result = await service.getFullPreferences(userId);

      expect(result).toEqual(mockFullPreferences);
      expect(preferencesService.getFullPreferences).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('updateFullPreferences', () => {
    it('should delegate to preferencesService', async () => {
      const userId = 'user-123';
      const updateFullPreferencesDto = {
        theme: 'light',
        palette: 'green',
      };
      const mockResult = {
        success: true,
        preferences: updateFullPreferencesDto,
      };
      mockPreferencesService.updateFullPreferences.mockResolvedValue(
        mockResult,
      );

      const result = await service.updateFullPreferences(
        userId,
        updateFullPreferencesDto,
      );

      expect(result).toEqual(mockResult);
      expect(preferencesService.updateFullPreferences).toHaveBeenCalledWith(
        userId,
        updateFullPreferencesDto,
      );
    });
  });

  describe('updateUsername', () => {
    it('should delegate to usernameService', async () => {
      const userId = 'user-123';
      const updateUsernameDto = {
        username: 'newusername',
      };
      const mockResult = {
        success: true,
        username: 'newusername',
      };
      mockUsernameService.updateUsername.mockResolvedValue(mockResult);

      const result = await service.updateUsername(userId, updateUsernameDto);

      expect(result).toEqual(mockResult);
      expect(usernameService.updateUsername).toHaveBeenCalledWith(
        userId,
        updateUsernameDto,
      );
    });
  });
});
